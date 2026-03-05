package ma.splittrack.summary.api.dto;

import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DateRangeDTO {
    private LocalDate dateFrom;
    private LocalDate dateTo;
}
