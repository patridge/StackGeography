using System.Configuration;
using System.Web;
using Newtonsoft.Json;
using StackGeography.Models;
using StackGeography.Services;

namespace StackGeography {
    public class geocode : IHttpHandler {
        public void ProcessRequest(HttpContext context) {
            context.Response.ContentType = "application/json";
            string location = context.Request.Params["loc"];
            GeocodingResult result = this.GeocodingCache.Lookup(location);
            if (result == null) {
                GeocodingLookupServiceResult lookupResult = this.GeocodingLookupService.Geocode(location);
                if (lookupResult.Status == GeocodingLookupServiceResult.LookupStatus.Ok
                    || lookupResult.Status == GeocodingLookupServiceResult.LookupStatus.ZeroResults) {
                    // Cache successful results (including no-such-address results).
                    this.GeocodingCache.Store(result);
                }
                result = lookupResult;
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
            return geocodingCache;
        }
        public geocode() : this(GetGeocodingCache(), new GoogleMapsGeocodingLookupService()) { }
    }
}