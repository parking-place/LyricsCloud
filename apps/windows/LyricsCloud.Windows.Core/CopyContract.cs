using System.Text;
using System.Text.RegularExpressions;

namespace LyricsCloud.Windows.Core;

public sealed record CopyPayload(string Payload, int CodePointCount, bool ExceedsRecommendedLimit);

public static partial class CopyContract
{
    public const int LyricWarningLimit = 3_000;

    public static CopyPayload BuildLyricPayload(string document)
    {
        var payload = CopyWholeLyric(document);
        var count = payload.EnumerateRunes().Count();
        return new(payload, count, count > LyricWarningLimit);
    }

    public static string CopyWholeLyric(string document)
    {
        var normalized = NormalizeLineEndings(document);
        var result = new StringBuilder(normalized.Length);
        var offset = 0;
        while (offset < normalized.Length)
        {
            var newline = normalized.IndexOf('\n', offset);
            var hasEnding = newline >= 0;
            var end = hasEnding ? newline : normalized.Length;
            var line = normalized[offset..end];
            if (!ExtendMarker().IsMatch(line))
            {
                result.Append(line);
                if (hasEnding) result.Append('\n');
            }
            offset = hasEnding ? end + 1 : normalized.Length;
        }
        return result.ToString();
    }

    public static string CopySongFormSections(string document, IReadOnlyCollection<int> selectedSectionIndexes)
    {
        var normalized = NormalizeLineEndings(document);
        var starts = SongFormMarker().Matches(normalized).Select(match => match.Index).ToArray();
        var selected = selectedSectionIndexes.Order().Distinct().Select(index =>
        {
            if (index < 0 || index >= starts.Length) throw new ArgumentOutOfRangeException(nameof(selectedSectionIndexes));
            var start = starts[index];
            var end = index + 1 < starts.Length ? starts[index + 1] : normalized.Length;
            return normalized[start..end];
        });
        return selected.Aggregate(string.Empty, (result, slice) =>
            result.Length == 0 || result.EndsWith('\n') ? result + slice : result + "\n" + slice);
    }

    public static string NormalizeLineEndings(string value) => value.Replace("\r\n", "\n").Replace('\r', '\n');

    [GeneratedRegex(@"^[^\S\n]*\[Extend(?::[^\[\]\n]*)?\][^\S\n]*$", RegexOptions.CultureInvariant)]
    private static partial Regex ExtendMarker();

    [GeneratedRegex(@"(?m)^\s*\[[^\[\]\r\n]+\]\s*(?:\n|$)", RegexOptions.CultureInvariant)]
    private static partial Regex SongFormMarker();
}
