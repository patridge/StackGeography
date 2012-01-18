namespace StackGeography.Controllers {
    using System;
    using System.Collections;
    using System.Collections.Concurrent;
    using System.Collections.Generic;
    using System.Configuration;
    using System.Linq;
    using System.Threading.Tasks;
    using System.Web.Mvc;
    using StackGeography.Models;
    using StackGeography.Services;

    public class GeocodeController : Controller {
        [ValidateInput(false)] // Some user locations are UTF encoded (e.g., &#246; => ö)
        public JsonResult Index(string locs) {
            // NOTE: Switched from ';'-delimited since encoded UTF chars end with those.
            string[] locations = (locs ?? "").Split(new[] { "||" }, StringSplitOptions.RemoveEmptyEntries);
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
            return Json(new { results = massagedDictionary }, JsonRequestBehavior.AllowGet);
        }

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

        public IGeocodingCache GeocodingCache { get; set; }
        public IGeocodingLookupService GeocodingLookupService { get; set; }
        public GeocodeController(IGeocodingCache geocodingCache, IGeocodingLookupService geocodingLookupService) {
            this.GeocodingCache = geocodingCache;
            this.GeocodingLookupService = geocodingLookupService;
        }
        private static IGeocodingCache GetGeocodingCache() {
            string connectionString = ConfigurationManager.ConnectionStrings["StackGeography"].ConnectionString;
            IGeocodingCache geocodingCache = new SqlServerGeocodingCache(connectionString);
            return geocodingCache;
        }
        public GeocodeController() : this(GetGeocodingCache(), new GoogleMapsGeocodingLookupService()) { }
    }
}
