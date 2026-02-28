package ma.splittrack.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.time.YearMonth;

import ma.splittrack.dto.ExpenseCreateRequest;
import ma.splittrack.dto.ExpenseDTO;
import ma.splittrack.service.ExpenseService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springdoc.core.annotations.ParameterObject;
import ma.splittrack.dto.PageResponse;
import ma.splittrack.model.Scope;

@RestController
@RequestMapping("/api")
@Tag(name = "Expenses")
public class ExpenseController {
    private final ExpenseService expenseService;

    public ExpenseController(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    @PostMapping("/expenses")
    @Operation(summary = "Create a new expense")
    public ExpenseDTO createExpense(@Valid @RequestBody ExpenseCreateRequest request) {
        return expenseService.create(request);
    }

    @GetMapping("/expenses")
    @Operation(summary = "List expenses")
    public PageResponse<ExpenseDTO> listExpenses(
        @RequestParam(name = "scope", defaultValue = "cycle") String scope,
        @RequestParam(name = "month", required = false) String month,
        @RequestParam(name = "q", required = false) String q,
        @RequestParam(name = "dateFrom", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
        @RequestParam(name = "dateTo", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
        @ParameterObject @PageableDefault(size = 20, sort = "expenseDate", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Scope resolvedScope = Scope.valueOf(scope.toUpperCase());
        YearMonth resolvedMonth = month != null ? YearMonth.parse(month) : null;
        return expenseService.list(resolvedScope, resolvedMonth, q, dateFrom, dateTo, pageable);
    }
}
