-- AlterTable
-- Remove o campo updatedAt das tabelas groups e members que não existem no schema atual
ALTER TABLE "groups" DROP COLUMN IF EXISTS "updatedAt";
ALTER TABLE "members" DROP COLUMN IF EXISTS "updatedAt";

