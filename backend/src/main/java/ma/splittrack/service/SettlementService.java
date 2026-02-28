package ma.splittrack.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.List;
import java.util.stream.Collectors;

import ma.splittrack.dto.SettlementCreateRequest;
import ma.splittrack.dto.SettlementDTO;
import ma.splittrack.model.Settlement;
import ma.splittrack.repository.SettlementRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ma.splittrack.dto.PageResponse;
import ma.splittrack.model.Scope;

@Service
public class SettlementService {
    private final SettlementRepository settlementRepository;

    public SettlementService(SettlementRepository settlementRepository) {
        this.settlementRepository = settlementRepository;
    }

    @Transactional
    public SettlementDTO create(SettlementCreateRequest request) {
        if (request.getFromPerson() == request.getToPerson()) {
            throw new IllegalArgumentException("fromPerson and toPerson must be different");
        }
        if (request.getAmountPLN() == null || request.getAmountPLN().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("amountPLN must be > 0");
        }

        Settlement settlement = new Settlement();
        settlement.setFromPerson(request.getFromPerson());
        settlement.setToPerson(request.getToPerson());
        settlement.setAmountPLN(request.getAmountPLN().setScale(2, RoundingMode.HALF_UP));
        settlement.setFull(request.isFull());
        settlement.setNote(request.getNote() != null ? request.getNote().trim() : null);

        Settlement saved = settlementRepository.save(settlement);
        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    public PageResponse<SettlementDTO> list(Scope scope, YearMonth month, Pageable pageable) {
        if (scope == Scope.CYCLE) {
            throw new IllegalArgumentException("scope=CYCLE is not supported for settlements list");
        }

        Page<Settlement> page;
        if (scope == Scope.MONTH) {
            if (month == null) {
                throw new IllegalArgumentException("month is required for scope=MONTH");
            }
            OffsetDateTime start = month.atDay(1).atStartOfDay().atOffset(ZoneOffset.UTC);
            OffsetDateTime end = month.plusMonths(1).atDay(1).atStartOfDay().atOffset(ZoneOffset.UTC);
            page = settlementRepository.findByCreatedAtBetween(start, end, pageable);
        } else {
            page = settlementRepository.findAll(pageable);
        }

        List<SettlementDTO> items = page.getContent().stream()
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

    public SettlementDTO toDTO(Settlement settlement) {
        SettlementDTO dto = new SettlementDTO();
        dto.setId(settlement.getId());
        dto.setFromPerson(settlement.getFromPerson());
        dto.setToPerson(settlement.getToPerson());
        dto.setAmountPLN(settlement.getAmountPLN());
        dto.setFull(settlement.isFull());
        dto.setNote(settlement.getNote());
        dto.setCreatedAt(settlement.getCreatedAt());
        return dto;
    }
}
