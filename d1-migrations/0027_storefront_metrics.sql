CREATE TABLE StorefrontMetric (
  day TEXT NOT NULL,
  event TEXT NOT NULL CHECK(event IN ('page_view','view_item','search','search_empty','compare','add_to_cart','begin_checkout','order_requested','contact_click','appointment_requested')),
  count INTEGER NOT NULL DEFAULT 0 CHECK(count>=0),
  PRIMARY KEY(day,event)
);
