// ─── Saving a rule (PUT /Rules) ───────────────────────────────────
//
// The request body is the platform's contract, so it is asserted whole against
// the documented example. The store-level tests then prove the canvas maps onto
// that body — and that an incomplete expression never reaches the platform.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    EMPTY_GUID,
    buildRulePayload,
    saveDataQualityRules,
} from "../api/profisee";
import type { SaveRuleInput } from "../api/profisee";
import {
    buildSaveInput,
    defaultRuleDisplayText,
    useExpressionStore,
} from "../store";
import type { SaveRuleContext } from "../store";
import { attr, fn, lit } from "./helpers";

const PRODUCT_UID = "64b7a790-e507-486a-930d-4a8e1d77ddde";
const NAME_UID = "63ae9cb4-f60f-4e47-8d50-9b16a33fbe29";

describe("buildRulePayload", () => {
    it("matches the documented request body", () => {
        const input: SaveRuleInput = {
            entity: { name: "Product", id: PRODUCT_UID },
            attribute: { name: "Name", id: NAME_UID },
            isEnabled: true,
            validationClauses: [
                {
                    isConstraint: true,
                    whatExpression: '[Name] = "test"',
                    whatDisplayText: "name equals 'test'",
                    whenExpression: "[Name] <> NULL",
                },
            ],
            assignmentClauses: [
                {
                    whatExpression: '"test"',
                    whatDisplayText: "some display text",
                    whenExpression: "[Name] <> NULL",
                },
            ],
        };

        expect(buildRulePayload([input])).toEqual([
            {
                id: EMPTY_GUID,
                configuration: {
                    entityId: { name: "Product", id: PRODUCT_UID },
                    attributeId: { name: "Name", id: NAME_UID },
                    isEnabled: true,
                    validationClauses: [
                        {
                            isConstraint: true,
                            id: EMPTY_GUID,
                            whatExpression: '[Name] = "test"',
                            whatDisplayText: "name equals 'test'",
                            whenExpression: "[Name] <> NULL",
                            whenDisplayText: null,
                        },
                    ],
                    assignmentClauses: [
                        {
                            id: EMPTY_GUID,
                            whatExpression: '"test"',
                            whatDisplayText: "some display text",
                            whenExpression: "[Name] <> NULL",
                            whenDisplayText: null,
                        },
                    ],
                    assignmentExecutionMode: 1,
                },
            },
        ]);
    });

    it("keeps existing rule and clause ids for an update", () => {
        const [item] = buildRulePayload([
            {
                id: "rule-1",
                entity: { name: "Product" },
                validationClauses: [
                    { id: "clause-1", whatExpression: "[MSRP] > 0" },
                ],
            },
        ]);
        expect(item.id).toBe("rule-1");
        expect(item.configuration.validationClauses[0].id).toBe("clause-1");
    });

    it("sends the empty GUID when there is no id yet", () => {
        const [item] = buildRulePayload([
            {
                entity: { name: "Product" },
                assignmentClauses: [{ whatExpression: '"x"' }],
            },
        ]);
        expect(item.id).toBe(EMPTY_GUID);
        expect(item.configuration.assignmentClauses[0].id).toBe(EMPTY_GUID);
    });

    it("accepts an identifier given only by name or only by id", () => {
        const [byName] = buildRulePayload([
            {
                entity: { name: "Product" },
                validationClauses: [{ whatExpression: "[MSRP] > 0" }],
            },
        ]);
        expect(byName.configuration.entityId).toEqual({ name: "Product" });

        const [byId] = buildRulePayload([
            {
                entity: { id: PRODUCT_UID },
                validationClauses: [{ whatExpression: "[MSRP] > 0" }],
            },
        ]);
        expect(byId.configuration.entityId).toEqual({ id: PRODUCT_UID });
    });

    it("sends a null attributeId for an entity-level rule", () => {
        const [item] = buildRulePayload([
            {
                entity: { name: "Product" },
                validationClauses: [{ whatExpression: "[MSRP] > 0" }],
            },
        ]);
        expect(item.configuration.attributeId).toBeNull();
    });

    it("normalises blank and placeholder text to null", () => {
        const [item] = buildRulePayload([
            {
                entity: { name: "Product" },
                validationClauses: [
                    {
                        whatExpression: "  [MSRP] > 0  ",
                        whatDisplayText: "   ",
                        whenExpression: "/* empty */",
                    },
                ],
            },
        ]);
        const clause = item.configuration.validationClauses[0];
        expect(clause.whatExpression).toBe("[MSRP] > 0");
        expect(clause.whatDisplayText).toBeNull();
        expect(clause.whenExpression).toBeNull();
    });

    it("defaults isEnabled, isConstraint and the execution mode", () => {
        const [item] = buildRulePayload([
            {
                entity: { name: "Product" },
                validationClauses: [{ whatExpression: "[MSRP] > 0" }],
            },
        ]);
        expect(item.configuration.isEnabled).toBe(true);
        expect(item.configuration.validationClauses[0].isConstraint).toBe(
            false,
        );
        expect(item.configuration.assignmentExecutionMode).toBe(1);
    });

    it("rejects a rule with no entity reference", () => {
        expect(() =>
            buildRulePayload([
                {
                    entity: {},
                    validationClauses: [{ whatExpression: "[MSRP] > 0" }],
                },
            ]),
        ).toThrow(/entity name or id/);
    });

    it("rejects a clause with no what-expression", () => {
        expect(() =>
            buildRulePayload([
                {
                    entity: { name: "Product" },
                    validationClauses: [{ whatExpression: "/* empty */" }],
                },
            ]),
        ).toThrow(/what-expression/);
    });

    it("serialises several rules in one body", () => {
        const payload = buildRulePayload([
            {
                entity: { name: "Product" },
                validationClauses: [{ whatExpression: "[MSRP] > 0" }],
            },
            {
                entity: { name: "Product" },
                assignmentClauses: [{ whatExpression: '"x"' }],
            },
        ]);
        expect(payload).toHaveLength(2);
    });
});

describe("saveDataQualityRules request", () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        fetchMock.mockReset();
        fetchMock.mockResolvedValue({
            ok: true,
            status: 204,
            text: async () => "",
        });
        vi.stubGlobal("fetch", fetchMock);
        vi.stubGlobal("localStorage", {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("PUTs the payload to /Rules as JSON", async () => {
        await saveDataQualityRules([
            {
                entity: { name: "Product" },
                validationClauses: [{ whatExpression: "[MSRP] > 0" }],
            },
        ]);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("/profisee/rest/v1/Rules");
        expect(init.method).toBe("PUT");
        expect(init.headers["Content-Type"]).toBe("application/json");
        expect(JSON.parse(init.body)).toEqual(
            buildRulePayload([
                {
                    entity: { name: "Product" },
                    validationClauses: [{ whatExpression: "[MSRP] > 0" }],
                },
            ]),
        );
    });

    it("skips the request when there is nothing to save", async () => {
        await saveDataQualityRules([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("surfaces an API error with its status", async () => {
        fetchMock.mockResolvedValue({
            ok: false,
            status: 400,
            json: async () => ({ title: "Invalid expression" }),
        });
        await expect(
            saveDataQualityRules([
                {
                    entity: { name: "Product" },
                    validationClauses: [{ whatExpression: "[MSRP] > 0" }],
                },
            ]),
        ).rejects.toThrow(/400 — Invalid expression/);
    });

    it("reports an unreachable server", async () => {
        fetchMock.mockRejectedValue(new Error("boom"));
        await expect(
            saveDataQualityRules([
                {
                    entity: { name: "Product" },
                    validationClauses: [{ whatExpression: "[MSRP] > 0" }],
                },
            ]),
        ).rejects.toThrow(/Network error/);
    });
});

// ─── Canvas → request mapping ─────────────────────────────────────

const BASE: SaveRuleContext = {
    selectedEntityName: "Product",
    entities: [{ uid: PRODUCT_UID, name: "Product" }],
    blockConfigs: [
        { name: "Valid If", expressionMode: "validation" },
        { name: "When", expressionMode: "validation" },
    ],
    roots: [attr("[Name]"), null],
    generatedCodes: ["[Name]", "/* empty */"],
    isConstraint: false,
    ruleId: null,
    ruleClauseId: null,
    ruleAttributeName: null,
    ruleDisplayText: "",
    ruleIsEnabled: true,
};

const ctx = (over: Partial<SaveRuleContext> = {}): SaveRuleContext => ({
    ...BASE,
    ...over,
});

describe("defaultRuleDisplayText", () => {
    it("is the main expression when there is no WHEN block", () => {
        expect(defaultRuleDisplayText('[Name] = "test"', "/* empty */")).toBe(
            '[Name] = "test"',
        );
    });

    it("joins the main and WHEN expressions the way a clause reads", () => {
        expect(
            defaultRuleDisplayText('[Name] = "test"', "[Name] <> NULL"),
        ).toBe('[Name] = "test" WHEN [Name] <> NULL');
    });

    it("is blank when the main expression is empty", () => {
        expect(defaultRuleDisplayText("/* empty */", "[Name] <> NULL")).toBe(
            "",
        );
        expect(defaultRuleDisplayText("")).toBe("");
    });
});

describe("buildSaveInput", () => {
    it("maps a validation canvas onto a validation clause", () => {
        const input = buildSaveInput(
            ctx({
                roots: [fn("=", attr("[Name]"), lit('"test"')), null],
                generatedCodes: ['[Name] = "test"', "/* empty */"],
                ruleAttributeName: "Name",
                ruleDisplayText: "name equals 'test'",
                isConstraint: true,
            }),
        );

        expect(input).toEqual({
            id: null,
            entity: { name: "Product", id: PRODUCT_UID },
            attribute: { name: "Name" },
            isEnabled: true,
            validationClauses: [
                {
                    id: null,
                    isConstraint: true,
                    whatExpression: '[Name] = "test"',
                    whatDisplayText: "name equals 'test'",
                    whenExpression: null,
                },
            ],
            assignmentClauses: [],
        });
    });

    it("maps an assignment canvas onto an assignment clause", () => {
        const input = buildSaveInput(
            ctx({
                blockConfigs: [
                    { name: "Change to", expressionMode: "assignment" },
                    { name: "When", expressionMode: "validation" },
                ],
                roots: [lit('"test"'), fn("<>", attr("[Name]"), lit("NULL"))],
                generatedCodes: ['"test"', "[Name] <> NULL"],
                isConstraint: true, // must not leak into an assignment clause
            }),
        );

        expect(input).toMatchObject({
            validationClauses: [],
            assignmentClauses: [
                {
                    whatExpression: '"test"',
                    whenExpression: "[Name] <> NULL",
                },
            ],
        });
        expect(
            (input as SaveRuleInput).assignmentClauses?.[0],
        ).not.toHaveProperty("isConstraint");
    });

    it("defaults the display text to the clause when none is typed", () => {
        const input = buildSaveInput(
            ctx({
                roots: [
                    fn("=", attr("[Name]"), lit('"test"')),
                    fn("<>", attr("[Name]"), lit("NULL")),
                ],
                generatedCodes: ['[Name] = "test"', "[Name] <> NULL"],
                ruleDisplayText: "",
            }),
        ) as SaveRuleInput;
        expect(input.validationClauses?.[0].whatDisplayText).toBe(
            '[Name] = "test" WHEN [Name] <> NULL',
        );
    });

    it("defaults to the main expression alone when there is no WHEN", () => {
        const input = buildSaveInput(
            ctx({
                roots: [fn("=", attr("[Name]"), lit('"test"')), null],
                generatedCodes: ['[Name] = "test"', "/* empty */"],
                ruleDisplayText: "   ",
            }),
        ) as SaveRuleInput;
        expect(input.validationClauses?.[0].whatDisplayText).toBe(
            '[Name] = "test"',
        );
    });

    it("keeps a display text the user typed", () => {
        const input = buildSaveInput(
            ctx({
                roots: [fn("=", attr("[Name]"), lit('"test"')), null],
                generatedCodes: ['[Name] = "test"', "/* empty */"],
                ruleDisplayText: "name equals 'test'",
            }),
        ) as SaveRuleInput;
        expect(input.validationClauses?.[0].whatDisplayText).toBe(
            "name equals 'test'",
        );
    });

    it("defaults the display text for an assignment clause too", () => {
        const input = buildSaveInput(
            ctx({
                blockConfigs: [
                    { name: "Change to", expressionMode: "assignment" },
                    { name: "When", expressionMode: "validation" },
                ],
                roots: [lit('"test"'), fn("<>", attr("[Name]"), lit("NULL"))],
                generatedCodes: ['"test"', "[Name] <> NULL"],
            }),
        ) as SaveRuleInput;
        expect(input.assignmentClauses?.[0].whatDisplayText).toBe(
            '"test" WHEN [Name] <> NULL',
        );
    });

    it("carries the WHEN block into whenExpression", () => {
        const input = buildSaveInput(
            ctx({
                roots: [attr("[Name]"), fn("<>", attr("[Name]"), lit("NULL"))],
                generatedCodes: ["[Name]", "[Name] <> NULL"],
            }),
        ) as SaveRuleInput;
        expect(input.validationClauses?.[0].whenExpression).toBe(
            "[Name] <> NULL",
        );
    });

    it("keeps the loaded rule and clause ids so a save updates in place", () => {
        const input = buildSaveInput(
            ctx({ ruleId: "rule-1", ruleClauseId: "clause-1" }),
        ) as SaveRuleInput;
        expect(input.id).toBe("rule-1");
        expect(input.validationClauses?.[0].id).toBe("clause-1");
    });

    it("refuses a demo catalog", () => {
        expect(
            buildSaveInput(ctx({ selectedEntityName: "demo:product" })),
        ).toMatch(/demo catalogs are local only/);
    });

    it("refuses when no entity is selected", () => {
        expect(buildSaveInput(ctx({ selectedEntityName: null }))).toMatch(
            /Select a Profisee entity/,
        );
    });

    it("refuses an empty main block", () => {
        expect(
            buildSaveInput(
                ctx({
                    roots: [null, null],
                    generatedCodes: ["/* empty */", "/* empty */"],
                }),
            ),
        ).toBe("The Valid If expression is empty.");
    });

    it("refuses an incomplete main block", () => {
        expect(
            buildSaveInput(
                ctx({
                    roots: [fn("LENGTH", null), null],
                    generatedCodes: ["LENGTH(/* empty */)", "/* empty */"],
                }),
            ),
        ).toBe("Fill every slot in the Valid If expression before saving.");
    });

    it("refuses an incomplete WHEN block", () => {
        expect(
            buildSaveInput(
                ctx({
                    roots: [attr("[Name]"), fn("LENGTH", null)],
                    generatedCodes: ["[Name]", "LENGTH(/* empty */)"],
                }),
            ),
        ).toBe("Fill every slot in the When expression before saving.");
    });

    it("produces a payload the platform contract accepts", () => {
        const input = buildSaveInput(
            ctx({
                roots: [fn("=", attr("[Name]"), lit('"test"')), null],
                generatedCodes: ['[Name] = "test"', "/* empty */"],
                ruleAttributeName: "Name",
            }),
        ) as SaveRuleInput;

        const [item] = buildRulePayload([input]);
        expect(item.id).toBe(EMPTY_GUID);
        expect(item.configuration.entityId).toEqual({
            name: "Product",
            id: PRODUCT_UID,
        });
        expect(item.configuration.attributeId).toEqual({ name: "Name" });
        expect(item.configuration.validationClauses[0]).toEqual({
            isConstraint: false,
            id: EMPTY_GUID,
            whatExpression: '[Name] = "test"',
            // No display text typed → the clause text is sent instead
            whatDisplayText: '[Name] = "test"',
            whenExpression: null,
            whenDisplayText: null,
        });
    });
});

// ─── Store save flow ──────────────────────────────────────────────

describe("store.saveRule", () => {
    const fetchMock = vi.fn();
    const store = () => useExpressionStore.getState();

    beforeEach(() => {
        fetchMock.mockReset();
        fetchMock.mockResolvedValue({
            ok: true,
            status: 204,
            text: async () => "",
        });
        vi.stubGlobal("fetch", fetchMock);
        vi.stubGlobal("localStorage", {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
        });
        useExpressionStore.setState({
            selectedEntityName: "Product",
            entities: [{ uid: PRODUCT_UID, name: "Product" }],
            dataQualityRules: [],
            ruleId: null,
            ruleClauseId: null,
            ruleAttributeName: "Name",
            ruleDisplayText: "",
            ruleIsEnabled: true,
            ruleSaving: false,
            ruleSaveError: null,
            ruleSavedAt: null,
        });
        store().setScenario("validIf");
        store().setRoot(0, null);
        store().setRoot(1, null);
        store().setIsConstraint(false);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("PUTs the canvas and records a successful save", async () => {
        store().setRoot(0, fn("=", attr("[Name]"), lit('"test"')));
        store().setRoot(1, fn("<>", attr("[Name]"), lit("NULL")));
        store().setIsConstraint(true);
        store().setRuleDisplayText("name equals 'test'");

        await store().saveRule();

        const putCall = fetchMock.mock.calls.find(
            ([, init]) => init?.method === "PUT",
        )!;
        expect(putCall[0]).toBe("/profisee/rest/v1/Rules");
        expect(JSON.parse(putCall[1].body)).toEqual([
            {
                id: EMPTY_GUID,
                configuration: {
                    entityId: { name: "Product", id: PRODUCT_UID },
                    attributeId: { name: "Name" },
                    isEnabled: true,
                    validationClauses: [
                        {
                            isConstraint: true,
                            id: EMPTY_GUID,
                            whatExpression: '[Name] = "test"',
                            whatDisplayText: "name equals 'test'",
                            whenExpression: "[Name] <> NULL",
                            whenDisplayText: null,
                        },
                    ],
                    assignmentClauses: [],
                    assignmentExecutionMode: 1,
                },
            },
        ]);
        expect(store().ruleSaveError).toBeNull();
        expect(store().ruleSavedAt).not.toBeNull();
        expect(store().ruleSaving).toBe(false);
    });

    it("reloads the rules list after saving", async () => {
        store().setRoot(0, attr("[Name]"));
        await store().saveRule();
        const gets = fetchMock.mock.calls.filter(
            ([url, init]) =>
                init?.method === "GET" &&
                String(url).includes("/DataQualityRules"),
        );
        expect(gets).toHaveLength(1);
    });

    it("does not call the API when the canvas is incomplete", async () => {
        store().setRoot(0, fn("LENGTH", null));
        await store().saveRule();
        expect(fetchMock).not.toHaveBeenCalled();
        expect(store().ruleSaveError).toMatch(/Fill every slot/);
        expect(store().ruleSavedAt).toBeNull();
    });

    it("surfaces a rejected save and leaves savedAt unset", async () => {
        fetchMock.mockResolvedValue({
            ok: false,
            status: 400,
            json: async () => ({ title: "Invalid expression" }),
        });
        store().setRoot(0, attr("[Name]"));
        await store().saveRule();
        expect(store().ruleSaveError).toMatch(/400 — Invalid expression/);
        expect(store().ruleSavedAt).toBeNull();
        expect(store().ruleSaving).toBe(false);
    });

    it("targets the loaded rule after loading one of its clauses", () => {
        store().loadDqrClause('[Name] = "test" WHEN [Name] <> NULL', {
            ruleId: "rule-1",
            clauseId: "clause-1",
            attributeName: "Name",
            displayText: "name equals 'test'",
            isEnabled: false,
        });
        expect(store().ruleId).toBe("rule-1");
        expect(store().ruleClauseId).toBe("clause-1");
        expect(store().ruleAttributeName).toBe("Name");
        expect(store().ruleDisplayText).toBe("name equals 'test'");
        expect(store().ruleIsEnabled).toBe(false);
    });

    it("treats an empty GUID on a loaded clause as no id", () => {
        store().loadDqrClause("[MSRP] > 0", {
            ruleId: EMPTY_GUID,
            clauseId: EMPTY_GUID,
        });
        expect(store().ruleId).toBeNull();
        expect(store().ruleClauseId).toBeNull();
    });

    it("startNewRule clears the ids so the next save creates a rule", () => {
        store().loadDqrClause("[MSRP] > 0", {
            ruleId: "rule-1",
            clauseId: "clause-1",
        });
        store().startNewRule();
        expect(store().ruleId).toBeNull();
        expect(store().ruleClauseId).toBeNull();
    });
});
