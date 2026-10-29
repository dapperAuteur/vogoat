import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  LOCAL_SIGN_OUT_DESTINATION,
  SIGN_OUT_EVERYWHERE_HELP,
  SIGN_OUT_EVERYWHERE_LABEL,
  SIGN_OUT_LABEL,
  endSessionNavigationUrl,
  signOutEverywhere,
  signOutHere,
} from "@/lib/sign-out";

/**
 * Sign-out semantics (BAM, 2026-10-29, witus task 128 option (b)): "Sign out" leaves VO GOAT
 * only; "Sign out of WitUS everywhere" also ends the WitUS session, local session first.
 */

// The buttons import the browser auth client; rendering markup does not need it.
vi.mock("@/lib/auth-client", () => ({ authClient: { signOut: vi.fn() } }));

const { SignOutButton, SignOutEverywhereButton } = await import(
  "@/components/auth/sign-out-button"
);

const END_SESSION =
  "https://accounts.witus.online/api/idp/oauth2/endsession?client_id=vogoat-client";
const ORIGIN = "https://vogoat.witus.online";

describe('"Sign out" (VO GOAT only)', () => {
  it("ends the local session, then goes to /goodbye and never to the IdP", async () => {
    const calls: string[] = [];
    await signOutHere({
      signOut: async () => {
        calls.push("signOut");
      },
      navigate: (url) => calls.push(`navigate:${url}`),
    });
    expect(LOCAL_SIGN_OUT_DESTINATION).toBe("/goodbye");
    expect(calls).toEqual(["signOut", "navigate:/goodbye"]);
  });

  it("still goes to /goodbye when the sign-out call throws", async () => {
    const navigate = vi.fn();
    await signOutHere({ signOut: () => Promise.reject(new Error("down")), navigate });
    expect(navigate).toHaveBeenCalledWith("/goodbye");
  });

  it('is named exactly "Sign out" and carries no IdP URL', () => {
    const html = renderToStaticMarkup(createElement(SignOutButton));
    expect(SIGN_OUT_LABEL).toBe("Sign out");
    expect(html).toMatch(/<button[^>]*>Sign out<\/button>/);
    expect(html).not.toContain("WitUS");
    expect(html).not.toContain("endsession");
  });
});

describe('"Sign out of WitUS everywhere"', () => {
  it("is absent when the end-session URL is null", () => {
    expect(
      renderToStaticMarkup(createElement(SignOutEverywhereButton, { endSessionUrl: null })),
    ).toBe("");
  });

  it("is present with the help text wired through aria-describedby when configured", () => {
    const html = renderToStaticMarkup(
      createElement(SignOutEverywhereButton, { endSessionUrl: END_SESSION }),
    );
    expect(SIGN_OUT_EVERYWHERE_LABEL).toBe("Sign out of WitUS everywhere");
    expect(SIGN_OUT_EVERYWHERE_HELP).toBe(
      "Also signs you out of WitUS. Other WitUS apps you are signed in to stay signed in until you sign out of them.",
    );
    const describedBy = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(describedBy).toBeTruthy();
    expect(html).toContain(`>${SIGN_OUT_EVERYWHERE_LABEL}</button>`);
    expect(html).toContain(`id="${describedBy}"`);
    expect(html).toContain(SIGN_OUT_EVERYWHERE_HELP);
    expect(html).not.toContain("endsession");
  });

  it("ends the local session BEFORE navigating to the IdP", async () => {
    const calls: string[] = [];
    let finishSignOut!: () => void;
    const done = signOutEverywhere({
      signOut: () =>
        new Promise<void>((resolve) => {
          calls.push("signOut:start");
          finishSignOut = () => {
            calls.push("signOut:done");
            resolve();
          };
        }),
      navigate: (url) => calls.push(`navigate:${url}`),
      endSessionUrl: END_SESSION,
      origin: ORIGIN,
    });
    await Promise.resolve();
    expect(calls).toEqual(["signOut:start"]);
    finishSignOut();
    await done;
    expect(calls[1]).toBe("signOut:done");
    expect(calls[2]).toMatch(/^navigate:/);
  });

  it("still hands off to the IdP when the local sign-out throws", async () => {
    const navigate = vi.fn();
    await signOutEverywhere({
      signOut: () => Promise.reject(new Error("down")),
      navigate,
      endSessionUrl: END_SESSION,
      origin: ORIGIN,
    });
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it("navigates to endsession with client_id and an encoded origin + '/'", async () => {
    const navigate = vi.fn();
    await signOutEverywhere({ signOut: async () => {}, navigate, endSessionUrl: END_SESSION, origin: ORIGIN });
    expect(navigate).toHaveBeenCalledWith(
      "https://accounts.witus.online/api/idp/oauth2/endsession?client_id=vogoat-client" +
        "&post_logout_redirect_uri=https%3A%2F%2Fvogoat.witus.online%2F",
    );
    expect(endSessionNavigationUrl(END_SESSION, ORIGIN)).toBe(navigate.mock.calls[0][0]);
  });
});
