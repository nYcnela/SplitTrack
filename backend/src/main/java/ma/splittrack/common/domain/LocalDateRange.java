package ma.splittrack.common.domain;

import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class LocalDateRange {
    private final LocalDate from;
    private final LocalDate to;
}
