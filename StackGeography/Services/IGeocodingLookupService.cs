namespace StackGeography.Models {
    public interface IGeocodingLookupService {
        GeocodingLookupServiceResult Geocode(string location);
    }
}
