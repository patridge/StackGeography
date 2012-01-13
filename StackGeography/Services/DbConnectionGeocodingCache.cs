namespace StackGeography.Models {
    using System.Linq;
    using System;
    using System.Data;
    using Dapper;
    using System.Data.SqlClient;
using System.Data.SqlServerCe;

    public class SqlServerGeocodingCache : DbConnectionGeocodingCache {
        public override IDbConnection GetDbConnection() {
            return new SqlConnection(this.ConnectionString);
        }
        // Need to have TRY/CATCH for locking problems on live SQL Server (SQLCE doesn't support it, though).
        private const string tryCatchInsertSql = "BEGIN TRY INSERT INTO GeocodingResults (Location, Latitude, Longitude) VALUES (@location, @latitude, @longitude); END TRY BEGIN CATCH IF ERROR_NUMBER() <> 2627 BEGIN DECLARE @errorMessage NVARCHAR(4000), @errorSeverity INT, @errorState INT; SELECT @errorMessage = ERROR_MESSAGE(), @errorSeverity = ERROR_SEVERITY(), @errorState = ERROR_STATE(); RAISERROR (@errorMessage, @errorSeverity, @errorState); END END CATCH";
        protected override string InsertGeocodingResult {
            get {
                return tryCatchInsertSql;
            }
        }
        public SqlServerGeocodingCache(string connectionString) : base(connectionString) { }
    }
    public class SqlCeGeocodingCache : DbConnectionGeocodingCache {
        public override IDbConnection GetDbConnection() {
            return new SqlCeConnection(this.ConnectionString);
        }
        public SqlCeGeocodingCache(string connectionString) : base(connectionString) { }
    }

    public abstract class DbConnectionGeocodingCache : IGeocodingCache {
        public abstract IDbConnection GetDbConnection();
        public string ConnectionString { get; set; }
        public DbConnectionGeocodingCache(string connectionString) {
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
            using (IDbConnection connection = this.GetDbConnection()) {
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
        private const string plainInsertSql = "INSERT INTO GeocodingResults SELECT @location Location, @latitude Latitude, @longitude Longitude WHERE NOT EXISTS (SELECT 1 FROM GeocodingResults WITH (UPDLOCK, HOLDLOCK) WHERE Location = @location)";
        protected virtual string InsertGeocodingResult {
            get {
                return plainInsertSql;
            }
        }
        public void Store(GeocodingResult geocodingResult) {
            if (geocodingResult == null) {
                return;
            }
            Coordinates coords = geocodingResult.Coordinates;
            decimal? latitude = coords != null ? coords.Latitude : (decimal?)null;
            decimal? longitude = coords != null ? coords.Longitude : (decimal?)null;
            using (IDbConnection connection = this.GetDbConnection()) {
                connection.Open();
                connection.Execute(InsertGeocodingResult, new { location = geocodingResult.Location.ToUpperInvariant(), latitude = latitude, longitude = longitude });
            }
        }
    }
}