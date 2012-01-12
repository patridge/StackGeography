namespace StackGeography.Models {
    using System.IO;
    using System.Net;
    using System.Web;
    using Newtonsoft.Json;

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

        public GeocodingResult Geocode(string location) {
            GeocodingResult result = null;
            string url = "https://maps.googleapis.com/maps/api/geocode/json?sensor=false&address=" + HttpUtility.UrlEncode(location);
            WebRequest request = HttpWebRequest.Create(url);
            WebResponse response = request.GetResponse();
            using (StreamReader reader = new StreamReader(response.GetResponseStream())) {
                string json = reader.ReadToEnd();
                var deserializedJsonSubset = JsonConvert.DeserializeObject<GeocodeJsonStructure>(json);
                if (deserializedJsonSubset.status == "OK") {
                    Coordinates coords = new Coordinates() { Latitude = deserializedJsonSubset.results[0].geometry.location.lat, Longitude = deserializedJsonSubset.results[0].geometry.location.lng };
                    result = new GeocodingResult() { Location = location, Coordinates = coords };
                }
            }
            return result;
        }
    }
}