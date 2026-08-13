package ma.splittrack.expense.application;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;
import ma.splittrack.common.domain.LocalDateRange;
import ma.splittrack.common.domain.Person;
import ma.splittrack.common.domain.Scope;
import ma.splittrack.common.domain.SettlementMode;
import ma.splittrack.common.web.PageResponse;
import ma.splittrack.expense.api.dto.ExpenseCreateRequest;
import ma.splittrack.expense.api.dto.ExpenseDTO;
import ma.splittrack.expense.api.dto.ExpenseProjectAssignmentRequest;
import ma.splittrack.expense.domain.Expense;
import ma.splittrack.expense.infrastructure.ExpenseRepository;
import ma.splittrack.expense.infrastructure.ExpenseSpecifications;
import ma.splittrack.project.api.dto.ProjectRequest;
import ma.splittrack.project.application.ProjectService;
import ma.splittrack.project.infrastructure.ProjectRepository;
import ma.splittrack.summary.domain.BalanceCalculator;
import ma.splittrack.summary.domain.ImpliedTransfer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExpenseService {
    private final ExpenseRepository expenseRepository;
    private final ExpenseScopeResolver scopeResolver;
    private final BalanceCalculator balanceCalculator;
    private final ProjectRepository projectRepository;
    private final ProjectService projectService;

    public ExpenseService(ExpenseRepository expenseRepository, ExpenseScopeResolver scopeResolver, BalanceCalculator balanceCalculator,
                          ProjectRepository projectRepository, ProjectService projectService) {
        this.expenseRepository = expenseRepository;
        this.scopeResolver = scopeResolver;
        this.balanceCalculator = balanceCalculator;
        this.projectRepository = projectRepository;
        this.projectService = projectService;
    }

    @Transactional
    public ExpenseDTO create(ExpenseCreateRequest request) {
        validateRequest(request);

        String currency = request.getInputCurrency().trim().toUpperCase(Locale.ROOT);
        if (currency.length() < 3 || currency.length() > 5) {
            throw new IllegalArgumentException("inputCurrency must be 3-5 characters");
        }

        BigDecimal inputAmount = request.getInputAmount().setScale(2, RoundingMode.HALF_UP);
        BigDecimal exchangeRate;
        BigDecimal amountPLN;
        if ("PLN".equals(currency)) {
            exchangeRate = BigDecimal.ONE;
            amountPLN = inputAmount;
        } else {
            if (request.getExchangeRateToPLN() == null || request.getExchangeRateToPLN().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("exchangeRateToPLN is required and must be > 0 for non-PLN currency");
            }
            exchangeRate = request.getExchangeRateToPLN().setScale(6, RoundingMode.HALF_UP);
            amountPLN = inputAmount.multiply(exchangeRate).setScale(2, RoundingMode.HALF_UP);
        }

        Expense expense = new Expense();
        expense.setExpenseDate(request.getExpenseDate());
        expense.setDescription(request.getDescription().trim());
        expense.setPayer(request.getPayer());
        expense.setSettlementMode(request.getSettlementMode());
        expense.setCustomOwedPLN(scale2(request.getCustomOwedPLN()));
        expense.setOriginalAmount(inputAmount);
        expense.setOriginalCurrency(currency);
        expense.setExchangeRateToPLN(exchangeRate);
        expense.setAmountPLN(amountPLN);
        expense.setReceiptUrl(normalizeOptionalText(request.getReceiptUrl()));
        expense.setProjectId(resolveProjectId(request.getProjectId(), request.getNewProject()));

        Expense saved = expenseRepository.save(expense);
        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    public PageResponse<ExpenseDTO> list(Scope scope, YearMonth month, String query, LocalDate dateFrom, LocalDate dateTo, Pageable pageable) {
        if (scope == Scope.CYCLE) {
            LocalDate cycleStartDate = scopeResolver.resolveCycleStart()
                .map(odt -> odt.toLocalDate())
                .orElse(null);
            // Clamp user-supplied dateFrom to cycle start
            LocalDate effectiveFrom = (dateFrom == null || (cycleStartDate != null && dateFrom.isBefore(cycleStartDate)))
                ? cycleStartDate : dateFrom;
            dateFrom = effectiveFrom;
        }

        LocalDateRange dateRange = scopeResolver.resolveExpenseDateRange(scope, month, dateFrom, dateTo);
        Page<Expense> page = expenseRepository.findAll(ExpenseSpecifications.build(query, dateRange, null), pageable);

        List<ExpenseDTO> items = page.getContent().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());

        PageResponse.PageMeta meta = new PageResponse.PageMeta(
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages()
        );

        return new PageResponse<>(items, meta);
    }

    @Transactional
    public ExpenseDTO assignProject(Long expenseId, ExpenseProjectAssignmentRequest request) {
        validateProjectSelection(request.getProjectId(), request.getNewProject());
        Expense expense = expenseRepository.findById(expenseId)
            .orElseThrow(() -> new IllegalArgumentException("Wydatek nie istnieje"));
        expense.setProjectId(resolveProjectId(request.getProjectId(), request.getNewProject()));
        return toDTO(expense);
    }

    @Transactional(readOnly = true)
    public List<Expense> listForExport(Scope scope, YearMonth month, String query, LocalDate dateFrom, LocalDate dateTo) {
        if (scope == Scope.CYCLE) {
            LocalDate cycleStartDate = scopeResolver.resolveCycleStart()
                .map(odt -> odt.toLocalDate())
                .orElse(null);
            LocalDate effectiveFrom = (dateFrom == null || (cycleStartDate != null && dateFrom.isBefore(cycleStartDate)))
                ? cycleStartDate : dateFrom;
            dateFrom = effectiveFrom;
        }
        LocalDateRange dateRange = scopeResolver.resolveExpenseDateRange(scope, month, dateFrom, dateTo);
        return expenseRepository.findAll(ExpenseSpecifications.build(query, dateRange, null));
    }

    public ExpenseDTO toDTO(Expense expense) {
        ExpenseDTO dto = new ExpenseDTO();
        dto.setId(expense.getId());
        dto.setExpenseDate(expense.getExpenseDate());
        dto.setDescription(expense.getDescription());
        dto.setPayer(expense.getPayer());
        dto.setAmountPLN(expense.getAmountPLN());
        dto.setOriginalAmount(expense.getOriginalAmount());
        dto.setOriginalCurrency(expense.getOriginalCurrency());
        dto.setExchangeRateToPLN(expense.getExchangeRateToPLN());
        dto.setSettlementMode(expense.getSettlementMode());
        dto.setCustomOwedPLN(expense.getCustomOwedPLN());
        dto.setReceiptUrl(expense.getReceiptUrl());
        dto.setProjectId(expense.getProjectId());

        if (expense.getPayer() == Person.MACIEK) {
            dto.setMaciekPaid(expense.getAmountPLN());
        } else {
            dto.setEmilkaPaid(expense.getAmountPLN());
        }

        dto.setAffectsBalance(expense.getSettlementMode() != SettlementMode.NOT_SETTLED);

        Optional<ImpliedTransfer> transfer = balanceCalculator.impliedTransfer(expense);
        if (transfer.isPresent()) {
            dto.setOwedFrom(transfer.get().getFromPerson());
            dto.setOwedTo(transfer.get().getToPerson());
            dto.setOwedAmountPLN(transfer.get().getAmountPLN());
        }
        return dto;
    }

    private void validateRequest(ExpenseCreateRequest request) {
        if (request.getSettlementMode() == SettlementMode.CUSTOM) {
            if (request.getCustomOwedPLN() == null || request.getCustomOwedPLN().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("customOwedPLN is required and must be > 0 for CUSTOM settlement mode");
            }
        } else {
            if (request.getCustomOwedPLN() != null) {
                throw new IllegalArgumentException("customOwedPLN must be null unless settlementMode is CUSTOM");
            }
        }
        validateProjectSelection(request.getProjectId(), request.getNewProject());
    }

    private void validateProjectSelection(Long projectId, ProjectRequest newProject) {
        if (projectId != null && newProject != null) {
            throw new IllegalArgumentException("Wybierz istniejący projekt albo utwórz nowy");
        }
    }

    private Long resolveProjectId(Long projectId, ProjectRequest newProject) {
        if (newProject != null) {
            return projectService.create(newProject).getId();
        }
        if (projectId == null) {
            return null;
        }
        if (!projectRepository.existsById(projectId)) {
            throw new IllegalArgumentException("Projekt nie istnieje");
        }
        return projectId;
    }

    private BigDecimal scale2(BigDecimal value) {
        if (value == null) {
            return null;
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
