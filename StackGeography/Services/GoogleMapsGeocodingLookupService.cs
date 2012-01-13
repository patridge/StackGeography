namespace StackGeography.Services {
    using System.IO;
    using System.Net;
    using System.Web;
    using Newtonsoft.Json;
    using StackGeography.Models;

    public class GoogleMapsGeocodingLookupService : IGeocodingLookupService {
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

        private static GeocodingLookupServiceResult.LookupStatus ParseLookupStatus(string googleStatus) {
            GeocodingLookupServiceResult.LookupStatus status;
            switch (googleStatus) {
                case "OK":
                    status = GeocodingLookupServiceResult.LookupStatus.Ok;
                    break;
                case "ZERO_RESULTS":
                    status = GeocodingLookupServiceResult.LookupStatus.ZeroResults;
                    break;
                case "OVER_QUERY_LIMIT":
                    status = GeocodingLookupServiceResult.LookupStatus.OverQueryLimit;
                    break;
                case "REQUEST_DENIED":
                    status = GeocodingLookupServiceResult.LookupStatus.RequestDenied;
                    break;
                default: // case "INVALID_REQUEST":
                    status = GeocodingLookupServiceResult.LookupStatus.InvalidRequest;
                    break;
            }
            return status;
        }
        public GeocodingLookupServiceResult Geocode(string location) {
            GeocodingLookupServiceResult result;
            string url = "https://maps.googleapis.com/maps/api/geocode/json?sensor=false&address=" + HttpUtility.UrlEncode(location);
            WebRequest request = HttpWebRequest.Create(url);
            WebResponse response = request.GetResponse();
            using (StreamReader reader = new StreamReader(response.GetResponseStream())) {
                string json = reader.ReadToEnd();
                var deserializedJsonSubset = JsonConvert.DeserializeObject<GeocodeJsonStructure>(json);
                Coordinates coords = null;
                if (deserializedJsonSubset.status == "OK") {
                    coords = new Coordinates() { Latitude = deserializedJsonSubset.results[0].geometry.location.lat, Longitude = deserializedJsonSubset.results[0].geometry.location.lng };
                }
                result = new GeocodingLookupServiceResult() { Status = ParseLookupStatus(deserializedJsonSubset.status), Location = location, Coordinates = coords };
            }
            return result;
        }
    }
}