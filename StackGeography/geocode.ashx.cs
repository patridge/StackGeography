using System.Collections.Concurrent;
using System.IO;
using System.Linq;
using System.Net;
using System.Web;
using Newtonsoft.Json;
using StackGeography.Models;
using System.Data;
using System.Data.SqlClient;
using System.Configuration;
using System.Data.SqlServerCe;

namespace StackGeography {
    public class geocode : IHttpHandler {
        public void ProcessRequest(HttpContext context) {
            context.Response.ContentType = "application/json";
            string location = context.Request.Params["loc"];
            GeocodingResult result = this.GeocodingCache.Lookup(location);
            if (result == null) {
                result = this.GeocodingLookupService.Geocode(location);
                if (result == null) {
                    result = new GeocodingResult() { Location = location, Coordinates = null };
                }
                this.GeocodingCache.Store(result);
            }
            string jsonResult;
            if (result.Coordinates == null) {
                jsonResult = JsonConvert.SerializeObject(new { result = (object)null });
            }
            else {
                jsonResult = JsonConvert.SerializeObject(new { result = new { lat = result.Coordinates.Latitude, lng = result.Coordinates.Longitude } });
            }
            context.Response.Write(jsonResult);
        }

        public bool IsReusable {
            get {
                return false;
            }
        }
        public IGeocodingCache GeocodingCache { get; set; }
        public IGeocodingLookupService GeocodingLookupService { get; set; }
        public geocode(IGeocodingCache geocodingCache, IGeocodingLookupService geocodingLookupService) {
            this.GeocodingCache = geocodingCache;
            this.GeocodingLookupService = geocodingLookupService;
        }
        private static IGeocodingCache GetGeocodingCache() {
            string connectionString = ConfigurationManager.ConnectionStrings["StackGeography"].ConnectionString;
            IGeocodingCache geocodingCache = new SqlServerGeocodingCache(connectionString);
#if DEBUG
            // Override with local SQLCE connection string in debug.
            connectionString = ConfigurationManager.ConnectionStrings["StackGeography_sqlce"].ConnectionString;
            geocodingCache = new SqlCeGeocodingCache(connectionString);
#endif
            return geocodingCache;
        }
        public geocode() : this(GetGeocodingCache(), new GoogleMapsGeocodingLookupService()) { }
    }
}