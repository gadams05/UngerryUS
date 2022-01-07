def get_tract_sql(state):

  global db
  
  sql = '''SELECT 
state.abbreviation as abbreviation,
state.state_id as state_id, 
county.county_id as county_id, 
county.name as county_name,
tract.tract_id  as tract_id,
tract.name as tract_name,
tract.total as population,
tract.white as white,
tract.black as black,
tract.native as native,
tract.asian as asian, 
tract.latino as latino,
tract_geo.coordinates as coordinates
FROM
state 
JOIN county ON state.state_id=county.state_id 
JOIN tract ON county.state_id=tract.state_id AND county.county_id=tract.county_id
JOIN tract_geo ON tract.state_id=tract_geo.state_id AND tract.county_id=tract_geo.county_id AND tract.tract_id=tract_geo.county_id
WHERE 
state.abbreviation = "{state}'''

  return pd.read_sql_query(sql, db)