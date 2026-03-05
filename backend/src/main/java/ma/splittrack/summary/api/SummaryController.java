package ma.splittrack.summary.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.YearMonth;
import ma.splittrack.common.domain.Scope;
import ma.splittrack.summary.api.dto.SpendingChartResponse;
import ma.splittrack.summary.api.dto.SummaryResponse;
import ma.splittrack.summary.application.SummaryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@Tag(name = "Summary")
public class SummaryController {
    private final SummaryService summaryService;

    public SummaryController(SummaryService summaryService) {
        this.summaryService = summaryService;
    }

    @GetMapping("/summary")
    @Operation(summary = "Get summary dashboard")
    public SummaryResponse getSummary(
        @RequestParam(name = "scope", defaultValue = "cycle") String scope,
        @RequestParam(name = "month", required = false) String month
    ) {
        Scope resolvedScope = Scope.valueOf(scope.toUpperCase());
        YearMonth resolvedMonth = month != null ? YearMonth.parse(month) : null;
        return summaryService.getSummary(resolvedScope, resolvedMonth);
    }

    @GetMapping("/charts/spending")
    @Operation(summary = "Get spending chart data")
    public SpendingChartResponse getSpendingChart(
        @RequestParam(name = "scope", defaultValue = "cycle") String scope,
        @RequestParam(name = "month", required = false) String month
    ) {
        Scope resolvedScope = Scope.valueOf(scope.toUpperCase());
        YearMonth resolvedMonth = month != null ? YearMonth.parse(month) : null;
        return summaryService.getSpendingChart(resolvedScope, resolvedMonth);
    }
}
