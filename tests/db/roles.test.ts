import { afterAll, describe, expect, test } from "vitest";
import {
  assignSuperadmin,
  createAdminClient,
  requireDevelopmentProject,
  requireEnv,
  revokeSuperadmin,
} from "../../scripts/lib/admin";
import { signedInClient } from "./helpers";

const admin = createAdminClient();
const phone = requireEnv("TEST_PHONE_SUPERADMIN");

// Gli altri test hanno bisogno del superadmin di prova: il ruolo si ridà sempre alla fine.
afterAll(() => assignSuperadmin(admin, phone));

describe("ruolo superadmin", () => {
  test("tolto: dal login successivo non vale più; ridato: vale di nuovo", async () => {
    requireDevelopmentProject();
    const revoked = await revokeSuperadmin(admin, phone);
    expect(revoked.app_metadata.role).not.toBe("superadmin");
    const withoutRole = await signedInClient("SUPERADMIN");
    expect((await withoutRole.rpc("is_superadmin")).data).toBe(false);

    await assignSuperadmin(admin, phone);
    const withRole = await signedInClient("SUPERADMIN");
    expect((await withRole.rpc("is_superadmin")).data).toBe(true);
  });
});
