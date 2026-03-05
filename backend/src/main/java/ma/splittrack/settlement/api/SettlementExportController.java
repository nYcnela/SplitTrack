package ma.splittrack.settlement.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.YearMonth;
import java.util.List;
import ma.splittrack.common.domain.Scope;
import ma.splittrack.settlement.application.SettlementExportService;
import ma.splittrack.settlement.application.SettlementService;
import ma.splittrack.settlement.domain.Settlement;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/export")
@Tag(name = "Export")
public class SettlementExportController {
    private final SettlementService settlementService;
    private final SettlementExportService settlementExportService;

    public SettlementExportController(SettlementService settlementService, SettlementExportService settlementExportService) {
        this.settlementService = settlementService;
        this.settlementExportService = settlementExportService;
    }

    @GetMapping("/settlements.csv")
    @Operation(summary = "Export settlements as CSV")
    public void exportSettlementsCsv(
        @RequestParam(name = "scope", defaultValue = "lifetime") String scope,
        @RequestParam(name = "month", required = false) String month,
        HttpServletResponse response
    ) throws IOException {
        Scope resolvedScope = Scope.valueOf(scope.toUpperCase());
        YearMonth resolvedMonth = month != null ? YearMonth.parse(month) : null;
        List<Settlement> settlements = settlementService.listForExport(resolvedScope, resolvedMonth);
        settlementExportService.writeCsv(settlements, response);
    }

    @GetMapping("/settlements.xlsx")
    @Operation(summary = "Export settlements as XLSX")
    public void exportSettlementsXlsx(
        @RequestParam(name = "scope", defaultValue = "lifetime") String scope,
        @RequestParam(name = "month", required = false) String month,
        HttpServletResponse response
    ) throws IOException {
        Scope resolvedScope = Scope.valueOf(scope.toUpperCase());
        YearMonth resolvedMonth = month != null ? YearMonth.parse(month) : null;
        List<Settlement> settlements = settlementService.listForExport(resolvedScope, resolvedMonth);
        settlementExportService.writeXlsx(settlements, response);
    }
}
