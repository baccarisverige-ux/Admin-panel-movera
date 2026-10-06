import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SAFETY, emptySafety, safetyAction, validateSafety } from "./ops.ts";
const row = { id: "I1", name: "SOS", phone: "", zoneId: "Z001", status: "queued" };
test("incident ownership and outcome gate resolution",()=>{let b=emptySafety(); assert.ok(safetyAction(b,row,"a","resolve","done").error); const taken=safetyAction(b,row,"a","take","accepted"); b=taken.book; assert.ok(safetyAction(b,{...row,status:"taken"},"b","resolve","done").error); assert.ok(safetyAction(b,{...row,status:"taken"},"a","resolve","").error); const done=safetyAction(b,{...row,status:"taken"},"a","resolve","safe"); assert.equal(done.status,"resolved"); assert.equal(done.book.incidents.I1.events.length,2);});
test("safety limits validate finite values and relationships",()=>{assert.equal(validateSafety(DEFAULT_SAFETY),undefined); assert.ok(validateSafety({...DEFAULT_SAFETY,dailyHours:25})); assert.ok(validateSafety({...DEFAULT_SAFETY,impossibleTravelMps:NaN})); assert.ok(validateSafety({...DEFAULT_SAFETY,dailyHours:10,weeklyHours:5}));});
