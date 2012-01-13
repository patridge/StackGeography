namespace StackGeography.Models {
    public interface IGeocodingLookupService {
        GeocodingResult Geocode(string location);
    }
}
