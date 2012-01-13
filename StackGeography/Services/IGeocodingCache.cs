namespace StackGeography.Services {
    using System;
    using StackGeography.Models;

    public interface IGeocodingCache {
        GeocodingResult Lookup(string location);
        void Store(GeocodingResult geocodingResult);
    }
}
