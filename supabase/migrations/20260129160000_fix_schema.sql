DO $$ 
BEGIN 
    -- Add schedule_time to shoot_day_scenes if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shoot_day_scenes' AND column_name = 'schedule_time') THEN 
        ALTER TABLE "public"."shoot_day_scenes" ADD COLUMN "schedule_time" text; 
    END IF;

    -- Add title to scenes if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scenes' AND column_name = 'title') THEN 
        ALTER TABLE "public"."scenes" ADD COLUMN "title" text; 
    END IF;
END $$;
