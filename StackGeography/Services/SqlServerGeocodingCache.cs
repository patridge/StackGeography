namespace StackGeography.Services {
    using System.Linq;
    using System;
    using System.Data;
    using Dapper;
    using System.Data.SqlClient;
    using StackGeography.Models;

    public class SqlServerGeocodingCache : IGeocodingCache {
        public string ConnectionString { get; set; }
        public SqlServerGeocodingCache(string connectionString) {
            if (null == connectionString) {
                throw new ArgumentNullException("connectionString");
            }

            this.ConnectionString = connectionString;
        }
        private const string selectByLocation = "SELECT TOP(1) [Location], [Latitude], [Longitude] FROM [GeocodingResults] WHERE [Location] = @location";
        public GeocodingResult Lookup(string location) {
            if (location == null) {
                return null;
            }
            GeocodingResult result = null;
            using (IDbConnection connection = new SqlConnection(this.ConnectionString)) {
                connection.Open();
                dynamic data = connection.Query(selectByLocation, new { location = location.ToUpperInvariant() }).FirstOrDefault();
                if (data != null) {
                    Coordinates coords = null;
                    if (data.Latitude != null && data.Longitude != null) {
                        coords = new Coordinates() { Latitude = data.Latitude, Longitude = data.Longitude };
                    }
                    result = new GeocodingResult() { Location = data.Location, Coordinates = coords };
                }
            }
            return result;
        }
        private const string tryCatchInsertSql = "BEGIN TRY INSERT INTO GeocodingResults (Location, Latitude, Longitude) VALUES (@location, @latitude, @longitude); END TRY BEGIN CATCH IF ERROR_NUMBER() <> 2627 BEGIN DECLARE @errorMessage NVARCHAR(4000), @errorSeverity INT, @errorState INT; SELECT @errorMessage = ERROR_MESSAGE(), @errorSeverity = ERROR_SEVERITY(), @errorState = ERROR_STATE(); RAISERROR (@errorMessage, @errorSeverity, @errorState); END END CATCH";
        public void Store(GeocodingResult geocodingResult) {
            if (geocodingResult == null) {
                return;
            }
            Coordinates coords = geocodingResult.Coordinates;
            decimal? latitude = coords != null ? coords.Latitude : (decimal?)null;
            decimal? longitude = coords != null ? coords.Longitude : (decimal?)null;
            using (IDbConnection connection = new SqlConnection(this.ConnectionString)) {
                connection.Open();
                connection.Execute(tryCatchInsertSql, new { location = geocodingResult.Location.ToUpperInvariant(), latitude = latitude, longitude = longitude });
            }
        }
    }
}