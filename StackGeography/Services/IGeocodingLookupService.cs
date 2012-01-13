namespace StackGeography.Services {
    using StackGeography.Models;

    public interface IGeocodingLookupService {
        GeocodingLookupServiceResult Geocode(string location);
    }
}
