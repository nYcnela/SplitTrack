package ma.splittrack.settlement.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.YearMonth;
import ma.splittrack.common.domain.Scope;
import ma.splittrack.common.web.PageResponse;
import ma.splittrack.settlement.api.dto.SettlementCreateRequest;
import ma.splittrack.settlement.api.dto.SettlementDTO;
import ma.splittrack.settlement.application.SettlementService;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settlements")
@Tag(name = "Settlements")
public class SettlementController {
    private final SettlementService settlementService;

    public SettlementController(SettlementService settlementService) {
        this.settlementService = settlementService;
    }

    @PostMapping
    @Operation(summary = "Create a settlement")
    public SettlementDTO createSettlement(@Valid @RequestBody SettlementCreateRequest request) {
        return settlementService.create(request);
    }

    @GetMapping
    @Operation(summary = "List settlements")
    public PageResponse<SettlementDTO> listSettlements(
        @RequestParam(name = "scope", defaultValue = "lifetime") String scope,
        @RequestParam(name = "month", required = false) String month,
        @ParameterObject @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Scope resolvedScope = Scope.valueOf(scope.toUpperCase());
        YearMonth resolvedMonth = month != null ? YearMonth.parse(month) : null;
        return settlementService.list(resolvedScope, resolvedMonth, pageable);
    }
}
