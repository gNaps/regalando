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
import type * as giftEditor from "../giftEditor.js";
import type * as gifts from "../gifts.js";
import type * as guestAccess from "../guestAccess.js";
import type * as guests from "../guests.js";
import type * as http from "../http.js";
import type * as images from "../images.js";
import type * as inviteLinks from "../inviteLinks.js";
import type * as invites from "../invites.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_betaLimits from "../lib/betaLimits.js";
import type * as lib_guestAccess from "../lib/guestAccess.js";
import type * as lib_hostGuard from "../lib/hostGuard.js";
import type * as lib_images from "../lib/images.js";
import type * as lib_inviteToken from "../lib/inviteToken.js";
import type * as lib_linkMetadata from "../lib/linkMetadata.js";
import type * as lib_participantView from "../lib/participantView.js";
import type * as lib_validation from "../lib/validation.js";
import type * as listEditor from "../listEditor.js";
import type * as lists from "../lists.js";
import type * as memberships from "../memberships.js";
import type * as notes from "../notes.js";
import type * as previewQuota from "../previewQuota.js";
import type * as productLinks from "../productLinks.js";
import type * as profiles from "../profiles.js";
import type * as reservations from "../reservations.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  clerk: typeof clerk;
  giftEditor: typeof giftEditor;
  gifts: typeof gifts;
  guestAccess: typeof guestAccess;
  guests: typeof guests;
  http: typeof http;
  images: typeof images;
  inviteLinks: typeof inviteLinks;
  invites: typeof invites;
  "lib/access": typeof lib_access;
  "lib/betaLimits": typeof lib_betaLimits;
  "lib/guestAccess": typeof lib_guestAccess;
  "lib/hostGuard": typeof lib_hostGuard;
  "lib/images": typeof lib_images;
  "lib/inviteToken": typeof lib_inviteToken;
  "lib/linkMetadata": typeof lib_linkMetadata;
  "lib/participantView": typeof lib_participantView;
  "lib/validation": typeof lib_validation;
  listEditor: typeof listEditor;
  lists: typeof lists;
  memberships: typeof memberships;
  notes: typeof notes;
  previewQuota: typeof previewQuota;
  productLinks: typeof productLinks;
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
