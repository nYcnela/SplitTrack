package ma.splittrack.service;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Getter;
import ma.splittrack.model.Person;

@Getter
@AllArgsConstructor
public class ImpliedTransfer {
    private final Person fromPerson;
    private final Person toPerson;
    private final BigDecimal amountPLN;
}
