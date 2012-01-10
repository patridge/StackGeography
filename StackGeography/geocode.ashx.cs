using System.Collections.Concurrent;
using System.IO;
using System.Linq;
using System.Net;
using System.Web;
using Newtonsoft.Json;

namespace StackGeography {
    public class geocode : IHttpHandler {
        private class GeocodeResult {
            public decimal Latitude { get; set; }
            public decimal Longitude { get; set; }
            public string Status { get; set; }
            public GeocodeResult(string status, decimal latitude, decimal longitude) {
                this.Status = status;
                this.Latitude = latitude;
                this.Longitude = longitude;
            }
        }
        private class GeocodeJsonStructure {
            public class ResultsItem {
                public class GeometryData {
                    public class LocationData {
                        public decimal lat;
                        public decimal lng;
                    }
                    public LocationData location;
                }
                public GeometryData geometry;
            }
            public string status;
            public ResultsItem[] results;
        }
        // TODO: Put in SQLCE/Sqlite database.
        private static ConcurrentBag<string> geocodingFailures = new ConcurrentBag<string>();
        private static ConcurrentDictionary<string, GeocodeResult> geocodingCache = new ConcurrentDictionary<string, GeocodeResult>();

        private GeocodeResult LookUp(string location) {
            GeocodeResult result = null;
            geocodingCache.TryGetValue(location, out result);
            if (null == result) {
                string url = "https://maps.googleapis.com/maps/api/geocode/json?sensor=false&address=" + HttpUtility.UrlEncode(location);
                WebRequest request = HttpWebRequest.Create(url);
                WebResponse response = request.GetResponse();
                using (StreamReader reader = new StreamReader(response.GetResponseStream())) {
                    string json = reader.ReadToEnd();
                    var deserializedJsonSubset = JsonConvert.DeserializeObject<GeocodeJsonStructure>(json);
                    if (deserializedJsonSubset.status == "OK") {
                        result = new GeocodeResult(deserializedJsonSubset.status, deserializedJsonSubset.results[0].geometry.location.lat, deserializedJsonSubset.results[0].geometry.location.lng);
                    }
                }
            }
            return result;
        }
        public void ProcessRequest(HttpContext context) {
            context.Response.ContentType = "application/json";
            string location = context.Request.Params["loc"];
            string jsonResult;
            if (null == location || geocodingFailures.Contains(location)) {
                jsonResult = JsonConvert.SerializeObject(new { result = (object)null });
            }
            else {
                GeocodeResult lookUpResult = LookUp(location);
                if (lookUpResult == null) {
                    jsonResult = JsonConvert.SerializeObject(new { result = (object)null });
                    geocodingFailures.Add(location);                    
                }
                else {
                    jsonResult = JsonConvert.SerializeObject(new { status = lookUpResult.Status, result = new { lat = lookUpResult.Latitude, lng = lookUpResult.Longitude } });
                    geocodingCache.TryAdd(location, lookUpResult);
                }
            }
            context.Response.Write(jsonResult);
        }

        public bool IsReusable {
            get {
                return false;
            }
        }
    }
}