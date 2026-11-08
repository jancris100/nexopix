-- Internal codes move to English: agent ids, the agent recorded in approvals, and the format of pieces and agenda items.
UPDATE "agents" SET "id" = CASE "id"
  WHEN 'estratega' THEN 'strategist'
  WHEN 'guionista' THEN 'writer'
  WHEN 'enrutador' THEN 'router'
  WHEN 'programador' THEN 'scheduler'
  WHEN 'analista' THEN 'analyst'
  ELSE "id" END;--> statement-breakpoint
UPDATE "approvals" SET "agent" = CASE "agent"
  WHEN 'Estratega' THEN 'strategist'
  WHEN 'Programador' THEN 'scheduler'
  ELSE "agent" END;--> statement-breakpoint
UPDATE "pieces" SET "format" = CASE "format"
  WHEN 'publicacion' THEN 'post'
  WHEN 'carrusel' THEN 'carousel'
  WHEN 'historia' THEN 'story'
  WHEN 'anuncio' THEN 'ad'
  ELSE "format" END;--> statement-breakpoint
UPDATE "agenda_items" SET "format" = CASE "format"
  WHEN 'publicacion' THEN 'post'
  WHEN 'carrusel' THEN 'carousel'
  WHEN 'historia' THEN 'story'
  WHEN 'anuncio' THEN 'ad'
  ELSE "format" END;
