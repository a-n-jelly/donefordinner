
-- Fix 1: Change meal_plans policies from public to authenticated
DROP POLICY "Users can create own meal plans" ON meal_plans;
DROP POLICY "Users can delete own meal plans" ON meal_plans;
DROP POLICY "Users can update own meal plans" ON meal_plans;
DROP POLICY "Users can view own meal plans" ON meal_plans;

CREATE POLICY "Users can create own meal plans" ON meal_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own meal plans" ON meal_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own meal plans" ON meal_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own meal plans" ON meal_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Fix 2: Change meal_plan_items policies from public to authenticated
DROP POLICY "Users can create own meal plan items" ON meal_plan_items;
DROP POLICY "Users can delete own meal plan items" ON meal_plan_items;
DROP POLICY "Users can update own meal plan items" ON meal_plan_items;
DROP POLICY "Users can view own meal plan items" ON meal_plan_items;

CREATE POLICY "Users can create own meal plan items" ON meal_plan_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM meal_plans mp WHERE mp.id = meal_plan_items.meal_plan_id AND mp.user_id = auth.uid()));
CREATE POLICY "Users can delete own meal plan items" ON meal_plan_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM meal_plans mp WHERE mp.id = meal_plan_items.meal_plan_id AND mp.user_id = auth.uid()));
CREATE POLICY "Users can update own meal plan items" ON meal_plan_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM meal_plans mp WHERE mp.id = meal_plan_items.meal_plan_id AND mp.user_id = auth.uid()));
CREATE POLICY "Users can view own meal plan items" ON meal_plan_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM meal_plans mp WHERE mp.id = meal_plan_items.meal_plan_id AND mp.user_id = auth.uid()));

-- Fix 3: Restrict profiles SELECT to own profile only
DROP POLICY "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
