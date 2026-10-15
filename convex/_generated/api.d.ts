/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as clerk from "../clerk.js";
import type * as gifts from "../gifts.js";
import type * as guestAccess from "../guestAccess.js";
import type * as guests from "../guests.js";
import type * as http from "../http.js";
import type * as inviteLinks from "../inviteLinks.js";
import type * as invites from "../invites.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_guestAccess from "../lib/guestAccess.js";
import type * as lib_inviteToken from "../lib/inviteToken.js";
import type * as lib_participantView from "../lib/participantView.js";
import type * as lib_validation from "../lib/validation.js";
import type * as lists from "../lists.js";
import type * as memberships from "../memberships.js";
import type * as profiles from "../profiles.js";
import type * as reservations from "../reservations.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  clerk: typeof clerk;
  gifts: typeof gifts;
  guestAccess: typeof guestAccess;
  guests: typeof guests;
  http: typeof http;
  inviteLinks: typeof inviteLinks;
  invites: typeof invites;
  "lib/access": typeof lib_access;
  "lib/guestAccess": typeof lib_guestAccess;
  "lib/inviteToken": typeof lib_inviteToken;
  "lib/participantView": typeof lib_participantView;
  "lib/validation": typeof lib_validation;
  lists: typeof lists;
  memberships: typeof memberships;
  profiles: typeof profiles;
  reservations: typeof reservations;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
