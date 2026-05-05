-- Migration: Add is_onboarded to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN NOT NULL DEFAULT FALSE;
