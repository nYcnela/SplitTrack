package ma.splittrack.model;

import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class LocalDateRange {
    private final LocalDate from;
    private final LocalDate to;
}
