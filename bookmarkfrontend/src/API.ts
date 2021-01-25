/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type BookmarkInput = {
  url: string,
  desc: string,
};

export type AddBookmarkMutationVariables = {
  bookmark: BookmarkInput,
};

export type AddBookmarkMutation = {
  addBookmark:  {
    __typename: "Event",
    result: string,
  } | null,
};

export type DeleteBookmarkMutationVariables = {
  bookmarkId: string,
};

export type DeleteBookmarkMutation = {
  deleteBookmark:  {
    __typename: "Event",
    result: string,
  } | null,
};

export type GetBookmarksQuery = {
  getBookmarks:  Array< {
    __typename: "Bookmark",
    id: string,
    url: string,
    desc: string,
  } > | null,
};
