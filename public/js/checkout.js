document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('checkoutForm');
    if (!form) {
        console.error('Checkout form not found');
        return;
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get form values
        const eventDate = document.querySelector('[name="eventDate"]')?.value;
        const eventLocation = document.querySelector('[name="eventLocation"]')?.value?.trim();
        const contactPhone = document.querySelector('[name="contactPhone"]')?.value?.trim();
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
        const notes = document.querySelector('[name="notes"]')?.value?.trim();

        // Build payload (only include non-empty values)
        const payload = {};
        if (eventDate) payload.eventDate = eventDate;
        if (eventLocation) payload.eventLocation = eventLocation;
        if (contactPhone) payload.contactPhone = contactPhone;
        if (paymentMethod) payload.paymentMethod = paymentMethod;
        if (notes) payload.notes = notes;

        try {
            const res = await fetch('/customer/order', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            
            if (!res.ok) {
                alert(data.error || 'Có lỗi xảy ra khi xử lý đơn hàng');
                return;
            }

            // Handle success
            if (data.paymentUrl) {
                window.location.href = data.paymentUrl;
            } else if (data.redirectUrl) {
                window.location.href = data.redirectUrl;
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Có lỗi xảy ra khi xử lý đơn hàng');
        }
    });
});