-- Allow shop members to read click_events for standalone product clicks (collection_id IS NULL)
CREATE POLICY "Shop members can read click_events for standalone products"
  ON click_events FOR SELECT
  TO authenticated
  USING (
    collection_id IS NULL
    AND item_id IN (
      SELECT id FROM items WHERE shop_id IN (SELECT public.get_my_shop_ids())
    )
  );
