namespace StackGeography.Models {
    using System;
    using System.Collections.Generic;

    public interface IGeocodingCache {
        GeocodingResult Lookup(string location);
        void Store(GeocodingResult geocodingResult);
    }
}
