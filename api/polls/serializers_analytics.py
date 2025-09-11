from rest_framework import serializers


class EventInSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=['view','dwell','vote','share'])
    poll_id = serializers.IntegerField()
    dwell_ms = serializers.IntegerField(required=False, default=0, min_value=0)
    device_id = serializers.CharField(required=False, allow_blank=True, max_length=64)
