using System.Collections.Concurrent;
using System.IO;
using System.Linq;
using System.Net;
using System.Web;
using Newtonsoft.Json;
using StackGeography.Models;

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
        public geocode() : this(new SqlCachedGeocodingCache(System.Configuration.ConfigurationManager.ConnectionStrings["StackGeography"].ConnectionString), new GoogleMapsGeocodingLookupService()) { }
    }
}