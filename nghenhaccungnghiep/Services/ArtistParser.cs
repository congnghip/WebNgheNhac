using System.Text.RegularExpressions;

namespace nghenhaccungnghiep.Services;

public static class ArtistParser
{
    public static string[] SplitArtists(string artist)
    {
        if (string.IsNullOrWhiteSpace(artist))
            return [];

        var all = new List<string>();
        var norm = artist.Normalize(System.Text.NormalizationForm.FormC);
        var byWord = Regex.Split(norm, @"\s+(feat\.?|ft\.?|và|&)\s+", RegexOptions.IgnoreCase);
        foreach (var chunk in byWord)
        {
            var trimmed = chunk.Trim();
            if (trimmed.Length == 0) continue;
            if ("feat ft và & feat. ft.".Split(' ').Contains(trimmed.ToLower())) continue;

            var commaParts = trimmed.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(p => p.Trim()).Where(p => p.Length > 0).ToList();

            var merged = new List<string>();
            foreach (var cp in commaParts)
            {
                if (merged.Count > 0 && cp.StartsWith("The ", StringComparison.OrdinalIgnoreCase))
                    merged[^1] = merged[^1] + ", " + cp;
                else
                    merged.Add(cp);
            }
            all.AddRange(merged);
        }
        return all.Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
    }
}
