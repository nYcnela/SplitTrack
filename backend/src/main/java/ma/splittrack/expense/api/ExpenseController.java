package ma.splittrack.expense.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.time.YearMonth;
import ma.splittrack.common.domain.Scope;
import ma.splittrack.common.web.PageResponse;
import ma.splittrack.expense.api.dto.ExpenseCreateRequest;
import ma.splittrack.expense.api.dto.ExpenseDTO;
import ma.splittrack.expense.api.dto.ReceiptOcrResponse;
import ma.splittrack.expense.api.dto.ReceiptUploadResponse;
import ma.splittrack.expense.application.ExpenseReceiptStorageService;
import ma.splittrack.expense.application.ReceiptOcrService;
import ma.splittrack.expense.application.ExpenseService;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
@Tag(name = "Expenses")
public class ExpenseController {
    private final ExpenseService expenseService;
    private final ExpenseReceiptStorageService receiptStorageService;
    private final ReceiptOcrService receiptOcrService;

    public ExpenseController(
        ExpenseService expenseService,
        ExpenseReceiptStorageService receiptStorageService,
        ReceiptOcrService receiptOcrService
    ) {
        this.expenseService = expenseService;
        this.receiptStorageService = receiptStorageService;
        this.receiptOcrService = receiptOcrService;
    }

    @PostMapping("/expenses")
    @Operation(summary = "Create a new expense")
    public ExpenseDTO createExpense(@Valid @RequestBody ExpenseCreateRequest request) {
        return expenseService.create(request);
    }

    @PostMapping(value = "/expenses/receipt", consumes = "multipart/form-data")
    @Operation(summary = "Upload receipt image")
    public ReceiptUploadResponse uploadReceipt(@RequestPart("file") MultipartFile file) {
        String receiptUrl = receiptStorageService.store(file);
        return new ReceiptUploadResponse(receiptUrl);
    }

    @PostMapping(value = "/expenses/receipt/ocr", consumes = "multipart/form-data")
    @Operation(summary = "Recognize receipt line items with OCR")
    public ReceiptOcrResponse recognizeReceipt(@RequestPart("file") MultipartFile file) {
        return receiptOcrService.recognize(file);
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
