import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const template = fs.readFileSync(new URL("../../views/dashboard/index.ejs", import.meta.url), "utf8");
const script = [...template.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).find(source => source.includes("function handleOscarVoiceEvent"));

function setup() {
  class Element {
    constructor(tag = "div") { this.tagName = tag; this.children = []; this.dataset = {}; this.style = {}; this.listeners = {}; this.disabled = false; this.value = ""; this._text = ""; }
    appendChild(child) { child.parent = this; this.children.push(child); return child; }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(x => x !== this); }
    addEventListener(type, fn) { this.listeners[type] = fn; }
    setAttribute(name, value) { this[name] = value; }
    set textContent(value) { this._text = value; this.children = []; }
    get textContent() { return this._text + this.children.map(x => x.textContent).join(""); }
    set innerHTML(value) { this._text = value; this.children = []; }
    pause() {}
    async click() { await this.listeners.click?.(); }
  }
  const ids = new Map();
  for (const id of ["oscarChatForm", "oscarInput", "oscarMessages", "confirmationContainer", "voiceConfirmationContainer", "oscarVoiceMessages", "oscarSendMessageBtn", "oscarVoiceStatus", "oscarVoiceAudio", "oscarSidebarVoice", "sidebarVoiceStart", "sidebarVoiceMute", "sidebarVoiceEnd", "sidebarVoiceStatus", "sidebarVoiceBadge"]) ids.set(id, new Element());
  ids.get("oscarSidebarVoice").dataset.configured = "true";
  function findId(node, id) { if (node.id === id) return node; for (const child of node.children) { const found = findId(child, id); if (found) return found; } }
  const document = {
    getElementById(id) { return ids.get(id) ?? [...ids.values()].map(x => findId(x, id)).find(Boolean); },
    createElement(tag) { return new Element(tag); },
    createTextNode(text) { const node = new Element("#text"); node.textContent = text; return node; },
    querySelectorAll() { return []; },
  };
  const requests = [];
  const sent = [];
  let responder = async () => ({ ok: true, status: 200, json: async () => ({ success: true, data: { response: "Reply", action: "test_action" } }) });
  const context = vm.createContext({ document, URL, console: { error() {} }, csrfToken: "test-csrf", navigator: {}, window: { addEventListener() {} }, fetch: async (url, options) => { requests.push({ url, options }); return responder(url, options); }, sent });
  vm.runInContext(script, context);
  const run = code => vm.runInContext(code, context);
  return { ids, requests, sent, run, respond(fn) { responder = fn; }, voice() { run('oscarVoiceChannel = {readyState:"open", send(value) { sent.push(JSON.parse(value)); }, close() { this.readyState="closed"; }}; oscarVoiceActive = true;'); } };
}

const approval = id => ({ confirmationId: id, description: `Approve ${id}` });

test("voice transcripts do not append to text chat", () => {
  const f = setup();
  f.run('handleOscarVoiceEvent({type:"conversation.item.input_audio_transcription.completed", transcript:"Voice user"}); handleOscarVoiceEvent({type:"response.output_audio_transcript.done", transcript:"Voice assistant"});');
  assert.equal(f.ids.get("oscarMessages").children.length, 0);
  assert.equal(f.ids.get("oscarVoiceMessages").children.length, 2);
});

test("typed chat stays independent while voice is active", async () => {
  const f = setup(); f.voice();
  await f.run('submitOscarMessage("Typed message")');
  assert.equal(JSON.parse(f.requests[0].options.body).channel, "chat");
  assert.equal(f.ids.get("oscarMessages").children.length, 2);
  assert.equal(f.ids.get("oscarVoiceMessages").children.length, 0);
  assert.equal(f.ids.get("oscarSendMessageBtn").disabled, false);
  assert.equal(f.run("oscarVoiceActive"), true);
});

test("voice tool output, citations and approvals stay in voice panel", async () => {
  const f = setup(); f.voice();
  f.respond(async () => ({ ok: true, json: async () => ({ success: true, data: { response: "Source", citations: [{ end: 6, url: "https://example.com" }], confirmation: approval("voice-id") } }) }));
  await f.run('handleOscarVoiceToolCall({name:"ask_oscar", call_id:"call", arguments:JSON.stringify({message:"Find leads"})})');
  assert.equal(JSON.parse(f.requests[0].options.body).channel, "voice");
  assert.equal(f.ids.get("confirmationContainer").children.length, 0);
  assert.equal(f.ids.get("voiceConfirmationContainer").children.length, 1);
  assert.equal(f.ids.get("oscarMessages").children.length, 0);
  assert.match(f.ids.get("oscarVoiceMessages").textContent, /Source 1/);
  assert.equal(f.sent[0].item.type, "function_call_output");
  assert.equal(f.sent[1].type, "response.create");
});

test("late voice tool result after stop does not populate either panel", async () => {
  const f = setup(); f.voice();
  let resolve;
  f.respond(() => new Promise(done => { resolve = done; }));
  const pending = f.run('handleOscarVoiceToolCall({name:"ask_oscar",call_id:"old",arguments:JSON.stringify({message:"Old request"})})');
  await f.run("stopOscarVoice()");
  resolve({ ok: true, json: async () => ({ success: true, data: { response: "Old reply", confirmation: approval("old-id") } }) });
  await pending;
  assert.equal(f.ids.get("voiceConfirmationContainer").children.length, 0);
  assert.equal(f.ids.get("confirmationContainer").children.length, 0);
  assert.equal(f.sent.length, 0);
});

test("approval uses confirmationId and affects only its own card and channel", async () => {
  const f = setup();
  f.run(`showConfirmation(${JSON.stringify(approval("chat-id"))}); showConfirmation(${JSON.stringify(approval("voice-id"))}, "voice"); showConfirmation(${JSON.stringify(approval("voice-2"))}, "voice");`);
  const card = f.ids.get("voiceConfirmationContainer").children[0];
  await card.children.at(-1).children[1].click();
  assert.deepEqual(JSON.parse(f.requests[0].options.body), { confirmationId: "voice-id", channel: "voice" });
  assert.equal(f.ids.get("confirmationContainer").children.length, 1);
  assert.equal(f.ids.get("voiceConfirmationContainer").children.length, 1);
  assert.equal(f.ids.get("oscarMessages").children.length, 0);
  assert.match(f.ids.get("oscarVoiceMessages").textContent, /completed successfully/);
});

test("unsafe citation URLs remain text, and stopping voice releases microphone", async () => {
  const f = setup(); f.voice();
  f.run('addOscarVoiceMessage("safe text", "oscar", [null, {end:9,url:"javascript:alert(1)"}]);');
  assert.equal(f.ids.get("oscarVoiceMessages").textContent, "safe text");
  f.run('globalThis.track = {enabled:true, stopped:false, stop(){this.stopped=true;}}; oscarVoiceStream = {getTracks(){return [track]},getAudioTracks(){return [track]}};');
  await f.run("stopOscarVoice()");
  assert.equal(f.run("track.stopped"), true);
  assert.equal(f.ids.get("oscarSendMessageBtn").disabled, false);
});


test("multiple approvals render as distinct cards", () => {
  const f = setup();
  f.run('for (const item of getOscarConfirmations({confirmations:[{confirmationId:"one"},{confirmationId:"two"}]})) showConfirmation(item,"chat");');
  assert.equal(f.ids.get("confirmationContainer").children.length,2);
});

test("successful voice approval updates voice context without rerunning tools", async () => {
  const f = setup(); f.voice();
  f.respond(async () => ({ok:true,json:async()=>({success:true,data:{action:"send_email",email:{to:"test@example.com"}},confirmationOutcome:{status:"completed",historySaved:true,memoryMessage:"Server verified completion"}})}));
  f.run('showConfirmation({confirmationId:"voice-id"},"voice")');
  await f.ids.get("voiceConfirmationContainer").children[0].children.at(-1).children[1].click();
  assert.equal(f.sent.length,1);
  assert.equal(f.sent[0].type,"conversation.item.create");
  assert.equal(f.sent[0].item.role,"system");
  assert.equal(f.sent[0].item.content[0].text,"Server verified completion");
});

test("approval from an ended call cannot update a later voice session", async () => {
  const f = setup(); f.voice();
  f.respond(async () => ({ok:true,json:async()=>({success:true,data:{action:"test"},confirmationOutcome:{historySaved:true,memoryMessage:"Old completion"}})}));
  f.run('showConfirmation({confirmationId:"old-id"},"voice")');
  await f.run("stopOscarVoice()");f.voice();
  await f.ids.get("voiceConfirmationContainer").children[0].children.at(-1).children[1].click();
  assert.equal(f.sent.length,0);
});

test("busy confirmation remains available for an explicit later retry", async () => {
  const f=setup();f.run('showConfirmation({confirmationId:"busy-id"})');
  f.respond(async()=>({ok:false,status:409,json:async()=>({success:false,error:"OSCAR is still processing"})}));
  const card=f.ids.get("confirmationContainer").children[0];
  const confirm=card.children.at(-1).children[1];
  await confirm.click();
  assert.equal(f.ids.get("confirmationContainer").children.length,1);
  assert.equal(confirm.disabled,false);
});
