import test from "node:test";
import assert from "node:assert/strict";
import { createOscarApprovalResolver } from "../services/oscar-approval-resolution.service.js";
import { extractOscarConfirmations, extractOscarConfirmation } from "../services/oscar-result.service.js";

function fixture({ throws = false, memoryThrows = false, success = true } = {}) {
  const pending = new Map([["approval-a", {confirmationId:"approval-a",userId:"owner",action:"send_email",description:"Send approved draft"}]]);
  const history = [];
  let executions = 0;
  const resolve = createOscarApprovalResolver({
    getConfirmation: id => pending.get(id),
    consumeConfirmation(id, userId) { const item = pending.get(id); if(item?.userId!==userId)return null; pending.delete(id);return item; },
    cancelConfirmation(id, userId) {if(pending.get(id)?.userId!==userId)return false;return pending.delete(id);},
    async executeConfirmedAction() {executions++;if(throws)throw new Error("Simulated timeout");return {success,action:"send_email",email:{id:"email-a"}};},
    async addMessage(...args) {if(memoryThrows)throw new Error("Simulated memory failure");history.push(args);},
  });
  return {resolve,pending,history,executions:()=>executions};
}
const request = {confirmationId:"approval-a",channel:"voice",context:{userId:"owner"}};

test("all distinct successful approval requests are returned, preserving singular fallback", () => {
  const confirmation = id => ({confirmationId:id,action:"create_lead"});
  const item = (id,success=true) => ({type:"tool_call_output_item",output:{success,requiresConfirmation:true,confirmation:confirmation(id)}});
  const result={newItems:[item("lead"),item("email"),item("email"),item("failed",false)]};
  assert.deepEqual(extractOscarConfirmations(result).map(x=>x.confirmationId),["lead","email"]);
  assert.equal(extractOscarConfirmation(result).confirmationId,"email");
});

test("completion is recorded in the originating channel and cannot execute twice", async () => {
  const f=fixture();const result=await f.resolve(request);
  assert.equal(result.confirmationOutcome.status,"completed");
  assert.equal(result.confirmationOutcome.records.email,"email-a");
  assert.equal(f.history[0][3],"voice");
  assert.match(f.history[0][2],/do not request it again/);
  await assert.rejects(f.resolve(request),{statusCode:404});
  assert.equal(f.executions(),1);
});

test("another user cannot consume an approval", async () => {
  const f=fixture();await assert.rejects(f.resolve({...request,context:{userId:"other"}}),{statusCode:404});
  assert.equal(f.executions(),0);assert.equal(f.pending.size,1);assert.equal(f.history.length,0);
});

test("cancellation is remembered without executing the action", async () => {
  const f=fixture();const result=await f.resolve({...request,mode:"cancel",channel:"chat"});
  assert.equal(result.confirmationOutcome.status,"cancelled");
  assert.equal(f.history[0][3],"chat");assert.equal(f.executions(),0);assert.equal(f.pending.size,0);
});

test("explicit failure is remembered as failed, not completed", async () => {
  const f=fixture({success:false});const result=await f.resolve(request);
  assert.equal(result.success,false);assert.equal(result.confirmationOutcome.status,"failed");
});

test("uncertain execution requests review and never automatically retries", async () => {
  const f=fixture({throws:true});const result=await f.resolve(request);
  assert.equal(result.httpStatus,502);assert.equal(result.confirmationOutcome.status,"review_required");
  assert.equal(f.executions(),1);assert.equal(f.pending.size,0);
});

test("memory failure after success does not change success or allow replay", async () => {
  const f=fixture({memoryThrows:true});const result=await f.resolve(request);
  assert.equal(result.success,true);assert.equal(result.confirmationOutcome.historySaved,false);
  await assert.rejects(f.resolve(request),{statusCode:404});assert.equal(f.executions(),1);
});

test("invalid channel is rejected before consuming approval", async () => {
  const f=fixture();await assert.rejects(f.resolve({...request,channel:"invalid"}),{statusCode:400});
  assert.equal(f.pending.size,1);assert.equal(f.executions(),0);
});

test("runner returns both approvals from one business request", async () => {
  const { createOscarRunner } = await import("../services/oscar-runner.service.js");
  const approvals = ["crm", "outreach"].map(confirmationId => ({confirmationId}));
  const run = createOscarRunner({
    isConfigured:()=>true,
    runAgent:async()=>({finalOutput:"Review both actions.",newItems:approvals.map(confirmation=>({type:"tool_call_output_item",output:{success:true,requiresConfirmation:true,confirmation}}))}),
    getConversation:async()=>[{role:"user",content:"Prepare CRM and outreach"}],
    addMessage:async()=>{},getBusinessContext:async()=>({}),
    events:new Proxy({}, {get:()=>()=>{}}),
  });
  const result=await run("Prepare CRM and outreach",{userId:"multi-approval-user"});
  assert.deepEqual(result.confirmations,approvals);
  assert.equal(result.confirmation.confirmationId,"outreach");
});
