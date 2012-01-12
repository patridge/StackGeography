namespace StackGeography.Models {
    using System.Linq;
    using System;
    using System.Data;
    using Dapper;

    public class SqlCachedGeocodingCache : IGeocodingCache {
        public string ConnectionString { get; set; }
        public SqlCachedGeocodingCache(string connectionString) {
            if (string.IsNullOrEmpty(connectionString)) {
                throw new ArgumentNullException("connectionString");
            }

            this.ConnectionString = connectionString;
        }
        private const string selectByLocation = "SELECT TOP(1) [Location], [Latitude], [Longitude] FROM [GeocodingResults] WHERE [Location] = @location";
        public GeocodingResult Lookup(string location) {
            if (location == null) {
                return null;
            }
            using (IDbConnection connection = new System.Data.SqlServerCe.SqlCeConnection(this.ConnectionString)) {
                connection.Open();
                dynamic data = connection.Query(selectByLocation, new { location = location.ToUpperInvariant() }).FirstOrDefault();
                GeocodingResult result = null;
                if (data != null) {
                    Coordinates coords = null;
                    if (data.Latitude != null && data.Longitude != null) {
                        coords = new Coordinates() { Latitude = data.Latitude, Longitude = data.Longitude };
                    }
                    result = new GeocodingResult() { Location = data.Location, Coordinates = coords };
                }
                return result;
            }
        }
        private const string insertGeocodingResult = "INSERT INTO GeocodingResults SELECT @location Location, @latitude Latitude, @longitude Longitude WHERE NOT EXISTS (SELECT 1 FROM GeocodingResults WITH (UPDLOCK, HOLDLOCK) WHERE Location = @location)";
        public void Store(GeocodingResult geocodingResult) {
            if (geocodingResult == null) {
                return;
            }
            Coordinates coords = geocodingResult.Coordinates;
            decimal? latitude = coords != null ? coords.Latitude : (decimal?)null;
            decimal? longitude = coords != null ? coords.Longitude : (decimal?)null;
            using (IDbConnection connection = new System.Data.SqlServerCe.SqlCeConnection(this.ConnectionString)) {
                connection.Open();
                connection.Execute(insertGeocodingResult, new { location = geocodingResult.Location.ToUpperInvariant(), latitude = latitude, longitude = longitude });
            }
        }
    }
}