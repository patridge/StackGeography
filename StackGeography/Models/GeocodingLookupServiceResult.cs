namespace StackGeography.Models {
    public class GeocodingLookupServiceResult : GeocodingResult {
        public enum LookupStatus {
            Ok,
            ZeroResults,
            OverQueryLimit,
            RequestDenied,
            InvalidRequest
        }
        public LookupStatus Status { get; set; }
    }
}