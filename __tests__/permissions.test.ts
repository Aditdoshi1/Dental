import { describe, it, expect } from "vitest";
import { canViewCollection, canEditCollection, canManageShop, canManageTeam } from "@/lib/permissions";
import type { Collection } from "@/types/database";

function makeCollection(overrides: Partial<Collection> = {}): Collection {
  return {
    id: "coll-1",
    shop_id: "shop-1",
    owner_id: "user-owner",
    title: "Test",
    slug: "test",
    description: "",
    visibility: "shop",
    active: true,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("canViewCollection", () => {
  it("anyone in shop can view a shop collection", () => {
    const coll = makeCollection({ visibility: "shop" });
    expect(canViewCollection(coll, "user-random", "member", [])).toBe(true);
  });

  it("owner of personal collection can view it", () => {
    const coll = makeCollection({ visibility: "personal", owner_id: "user-1" });
    expect(canViewCollection(coll, "user-1", "member", [])).toBe(true);
  });

  it("shop owner can view any personal collection", () => {
    const coll = makeCollection({ visibility: "personal", owner_id: "user-1" });
    expect(canViewCollection(coll, "user-2", "owner", [])).toBe(true);
  });

  it("non-shared member cannot view personal collection", () => {
    const coll = makeCollection({ visibility: "personal", owner_id: "user-1" });
    expect(canViewCollection(coll, "user-2", "member", [])).toBe(false);
  });

  it("shared member can view personal collection", () => {
    const coll = makeCollection({ visibility: "personal", owner_id: "user-1" });
    const shares = [{ user_id: "user-2" }];
    expect(canViewCollection(coll, "user-2", "member", shares)).toBe(true);
  });
});

describe("canEditCollection", () => {
  it("collection owner can always edit", () => {
    const coll = makeCollection({ owner_id: "user-1" });
    expect(canEditCollection(coll, "user-1", "member", [])).toBe(true);
  });

  it("shop admin can edit shop collections", () => {
    const coll = makeCollection({ visibility: "shop" });
    expect(canEditCollection(coll, "user-admin", "admin", [])).toBe(true);
  });

  it("shop admin cannot edit personal collection without share", () => {
    const coll = makeCollection({ visibility: "personal", owner_id: "user-1" });
    expect(canEditCollection(coll, "user-admin", "admin", [])).toBe(false);
  });

  it("member with readwrite share can edit", () => {
    const coll = makeCollection({ visibility: "personal", owner_id: "user-1" });
    const shares = [{ user_id: "user-2", permission: "readwrite" }];
    expect(canEditCollection(coll, "user-2", "member", shares)).toBe(true);
  });

  it("member with read share cannot edit", () => {
    const coll = makeCollection({ visibility: "personal", owner_id: "user-1" });
    const shares = [{ user_id: "user-2", permission: "read" }];
    expect(canEditCollection(coll, "user-2", "member", shares)).toBe(false);
  });

  it("regular member cannot edit shop collection", () => {
    const coll = makeCollection({ visibility: "shop", owner_id: "user-1" });
    expect(canEditCollection(coll, "user-random", "member", [])).toBe(false);
  });
});

describe("canManageShop", () => {
  it("owner can manage", () => expect(canManageShop("owner")).toBe(true));
  it("admin can manage", () => expect(canManageShop("admin")).toBe(true));
  it("member cannot manage", () => expect(canManageShop("member")).toBe(false));
});

describe("canManageTeam", () => {
  it("owner can manage team", () => expect(canManageTeam("owner")).toBe(true));
  it("admin can manage team", () => expect(canManageTeam("admin")).toBe(true));
  it("member cannot manage team", () => expect(canManageTeam("member")).toBe(false));
});
