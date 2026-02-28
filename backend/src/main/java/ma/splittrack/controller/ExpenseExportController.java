package ma.splittrack.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import ma.splittrack.model.Expense;
import ma.splittrack.service.ExpenseExportService;
import ma.splittrack.service.ExpenseService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ma.splittrack.model.Scope;

@RestController
@RequestMapping("/api/export")
@Tag(name = "Export")
public class ExpenseExportController {
    private final ExpenseService expenseService;
    private final ExpenseExportService exportService;

    public ExpenseExportController(ExpenseService expenseService, ExpenseExportService exportService) {
        this.expenseService = expenseService;
        this.exportService = exportService;
    }

    @GetMapping("/expenses.csv")
    @Operation(summary = "Export expenses as CSV")
    public void exportExpensesCsv(
        @RequestParam(name = "scope", defaultValue = "cycle") String scope,
        @RequestParam(name = "month", required = false) String month,
        @RequestParam(name = "q", required = false) String q,
        @RequestParam(name = "dateFrom", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
        @RequestParam(name = "dateTo", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
        HttpServletResponse response
    ) throws IOException {
        Scope resolvedScope = Scope.valueOf(scope.toUpperCase());
        YearMonth resolvedMonth = month != null ? YearMonth.parse(month) : null;
        List<Expense> expenses = expenseService.listForExport(resolvedScope, resolvedMonth, q, dateFrom, dateTo);
        exportService.writeCsv(expenses, response);
    }

    @GetMapping("/expenses.xlsx")
    @Operation(summary = "Export expenses as XLSX")
    public void exportExpensesXlsx(
        @RequestParam(name = "scope", defaultValue = "cycle") String scope,
        @RequestParam(name = "month", required = false) String month,
        @RequestParam(name = "q", required = false) String q,
        @RequestParam(name = "dateFrom", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
        @RequestParam(name = "dateTo", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
        HttpServletResponse response
    ) throws IOException {
        Scope resolvedScope = Scope.valueOf(scope.toUpperCase());
        YearMonth resolvedMonth = month != null ? YearMonth.parse(month) : null;
        List<Expense> expenses = expenseService.listForExport(resolvedScope, resolvedMonth, q, dateFrom, dateTo);
        exportService.writeXlsx(expenses, response);
    }
}
