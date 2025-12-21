-- Create function to normalize OEM numbers (remove spaces and special characters, uppercase)
CREATE OR REPLACE FUNCTION normalize_oem(text) RETURNS text AS $$
  SELECT UPPER(REGEXP_REPLACE($1, '[^A-Za-z0-9]', '', 'g'))
$$ LANGUAGE SQL IMMUTABLE;



