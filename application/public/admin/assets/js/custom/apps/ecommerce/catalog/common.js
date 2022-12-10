// Delete
function deleteItem(element) {
    const id = element.getAttribute('id')
    const url = element.getAttribute('url')
    const item = element.getAttribute('catalog_item')

    Swal.fire({
        text: 'Are you sure you want to delete ?',
        icon: 'warning',
        showCancelButton: !0,
        buttonsStyling: !1,
        confirmButtonText: 'Yes, delete!',
        cancelButtonText: 'No, cancel',
        customClass: {
            confirmButton: 'btn fw-bold btn-danger',
            cancelButton: 'btn fw-bold btn-active-light-primary',
        },
    }).then((e) => {
        if (e.value) {
            fetch(url, {
                method: 'POST',
                cache: 'no-cache',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id,
                    item,
                }),
            })
                .then(async (res) => {
                    const status = res.status
                    let data = await res.json()
                    if (status >= 200 && status < 300) {
                        Swal.fire({
                            text: data.message || 'You have deleted  !.',
                            icon: 'success',
                            buttonsStyling: !1,
                            confirmButtonText: 'Ok',
                            customClass: {
                                confirmButton: 'btn fw-bold btn-primary',
                            },
                        }).then(() => {
                            location.reload()
                        })
                    } else {
                        Swal.fire({
                            text: data.error || 'Something went wrong !.',
                            icon: 'warning',
                            buttonsStyling: !1,
                            confirmButtonText: 'Ok, got it!',
                            customClass: {
                                confirmButton: 'btn fw-bold btn-primary',
                            },
                        })
                    }
                })
                .catch((err) => {
                    Swal.fire({
                        text: 'Something went wrong !.',
                        icon: 'warning',
                        buttonsStyling: !1,
                        confirmButtonText: 'Ok, got it!',
                        customClass: {
                            confirmButton: 'btn fw-bold btn-primary',
                        },
                    })
                })
        }
    })
}
//- Change  status
function changeStatus(element, status) {
    const id = element.getAttribute('id')
    const url = element.getAttribute('url')
    const item = element.getAttribute('catalog_item')
    fetch(url, {
        method: 'POST',
        cache: 'no-cache',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            id,
            item,
            status,
        }),
    })
        .then(async (res) => {
            const status = res.status
            let data = await res.json()
            if (status >= 200 && status < 300) {
                location.reload()
            } else {
                Swal.fire({
                    text: data.error || 'Something went wrong !.',
                    icon: 'warning',
                    buttonsStyling: !1,
                    confirmButtonText: 'Ok, got it!',
                    customClass: {
                        confirmButton: 'btn fw-bold btn-primary',
                    },
                })
            }
        })
        .catch((err) => {
            Swal.fire({
                text: 'Something went wrong !.',
                icon: 'warning',
                buttonsStyling: !1,
                confirmButtonText: 'Ok, got it!',
                customClass: {
                    confirmButton: 'btn fw-bold btn-primary',
                },
            })
        })
}
