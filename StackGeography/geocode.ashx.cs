namespace StackGeography {
    using System;
    using System.Collections;
    using System.Collections.Concurrent;
    using System.Collections.Generic;
    using System.Configuration;
    using System.Linq;
    using System.Threading.Tasks;
    using System.Web;
    using Newtonsoft.Json;
    using StackGeography.Models;
    using StackGeography.Services;

    public class geocode : IHttpHandler {
        private GeocodingResult getGeocoding(string location) {
            GeocodingResult result = this.GeocodingCache.Lookup(location);
            if (result == null) {
                GeocodingLookupServiceResult lookupResult = this.GeocodingLookupService.Geocode(location);
                if (lookupResult.Status == GeocodingLookupServiceResult.LookupStatus.Ok
                    || lookupResult.Status == GeocodingLookupServiceResult.LookupStatus.ZeroResults) {
                    // Cache successful results (including no-such-address results).
                    this.GeocodingCache.Store(lookupResult);
                }
                result = lookupResult;
            }
            return result;
        }
        public void ProcessRequest(HttpContext context) {
            context.Response.ContentType = "application/json";
            string[] locations = (context.Request.Params["locs"] ?? "").Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries);
            List<Task> locationLookups = new List<Task>();
            ConcurrentDictionary<string, GeocodingResult> results = new ConcurrentDictionary<string, GeocodingResult>();
            foreach (string location in locations) {
                string currentLocation = location;
                locationLookups.Add(Task.Factory.StartNew(() => {
                    GeocodingResult result = null;
                    try {
                        result = getGeocoding(currentLocation);
                    }
                    catch {
                        // TODO: Log lookup errors.
                    }
                    results.TryAdd(currentLocation, result);
                }));
            }
            Task.WaitAll(locationLookups.ToArray());
            // Put into results[location] => { lat, lng }.
            IDictionary massagedDictionary = results.ToDictionary(kvp => kvp.Key, kvp => kvp.Value != null && kvp.Value.Coordinates != null ? new { lat = kvp.Value.Coordinates.Latitude, lng = kvp.Value.Coordinates.Longitude } : (object)null);
            string jsonResult = JsonConvert.SerializeObject(new { results = massagedDictionary });
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