-- Personal-data flags now live on variables only. Groups that were flagged as personal
-- never propagated to their variables, so copy the flag down (privacy-safe direction).
UPDATE "public"."CodebookEntry" e
SET "personalData" = true
FROM "public"."CodebookGroup" g
WHERE g."codebookId" = e."codebookId"
  AND g."personalData" = true
  AND left(e."dslKey", length(g."groupKey") + 1) = g."groupKey" || '.';
